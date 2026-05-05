package repository

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"git-visualizer/backend/config"

	"go.uber.org/fx"
	"go.uber.org/zap"
)

var (
	validNamePattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$`)
	validHashPattern = regexp.MustCompile(`^[0-9a-f]{4,40}$`)
	reMergePR        = regexp.MustCompile(`[Mm]erge pull request #(\d+)`)
	reSquashPR       = regexp.MustCompile(`\(#(\d+)\)\s*$`)
)

// logFormat uses ASCII unit separator (0x1F) to delimit fields safely.
const logFormat = "%H\x1f%P\x1f%an\x1f%at\x1f%s"

type GitRepo struct {
	reposPath string
	logger    *zap.Logger
}

type GitParams struct {
	fx.In
	Config *config.Config
	Logger *zap.Logger
}

func NewGit(p GitParams) GitRepository {
	return &GitRepo{
		reposPath: p.Config.Storage.ReposPath,
		logger:    p.Logger,
	}
}

func validateName(name string) error {
	if !validNamePattern.MatchString(name) {
		return fmt.Errorf("%w: %q is not a valid owner/repo name", ErrInvalidInput, name)
	}
	return nil
}

func (g *GitRepo) localPath(owner, name string) string {
	return filepath.Join(g.reposPath, owner, name)
}

func (g *GitRepo) EnsureRepo(ctx context.Context, owner, name string) (string, error) {
	if err := validateName(owner); err != nil {
		return "", err
	}
	if err := validateName(name); err != nil {
		return "", err
	}

	localPath := g.localPath(owner, name)
	if _, err := os.Stat(filepath.Join(localPath, ".git")); err == nil {
		return localPath, nil
	}

	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return "", fmt.Errorf("mkdir: %w", err)
	}

	url := fmt.Sprintf("https://github.com/%s/%s.git", owner, name)
	cmd := exec.CommandContext(ctx, "git", "clone", "--filter=blob:none", "--no-checkout", url, localPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	g.logger.Info("cloning repository", zap.String("url", url))
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("git clone failed: %w: %s", err, stderr.String())
	}

	return localPath, nil
}

func (g *GitRepo) FetchRepo(ctx context.Context, localPath string) error {
	cmd := exec.CommandContext(ctx, "git", "-C", localPath, "fetch", "--prune", "--all")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git fetch: %w: %s", err, stderr.String())
	}
	return nil
}

func (g *GitRepo) headCommit(ctx context.Context, localPath string) (string, error) {
	for _, ref := range []string{"origin/HEAD", "FETCH_HEAD", "HEAD"} {
		out, err := exec.CommandContext(ctx, "git", "-C", localPath, "rev-parse", ref).Output()
		if err == nil {
			return strings.TrimSpace(string(out)), nil
		}
	}
	return "", fmt.Errorf("cannot resolve HEAD in %s", localPath)
}

func extractPRNumber(message string) int {
	if m := reMergePR.FindStringSubmatch(message); m != nil {
		n, _ := strconv.Atoi(m[1])
		return n
	}
	if m := reSquashPR.FindStringSubmatch(message); m != nil {
		n, _ := strconv.Atoi(m[1])
		return n
	}
	return 0
}

func populatePRLinks(commits []Commit, owner, name string) {
	for i := range commits {
		if n := extractPRNumber(commits[i].Message); n > 0 {
			commits[i].PRLink = fmt.Sprintf("https://github.com/%s/%s/pull/%d", owner, name, n)
		}
	}
}

func (g *GitRepo) BuildFullGraph(ctx context.Context, owner, name, localPath string, limit int) (*Graph, error) {
	args := []string{"-C", localPath, "log", "--all"}
	if limit > 0 {
		args = append(args, fmt.Sprintf("--max-count=%d", limit))
	}
	args = append(args, "--pretty=format:"+logFormat)
	commits, err := g.runLog(ctx, args)
	if err != nil {
		return nil, err
	}

	populatePRLinks(commits, owner, name)

	head, err := g.headCommit(ctx, localPath)
	if err != nil {
		return nil, err
	}

	return &Graph{
		Repo:  fmt.Sprintf("%s/%s", owner, name),
		Head:  head,
		Nodes: commits,
	}, nil
}

func (g *GitRepo) BuildIncrementalGraph(ctx context.Context, owner, name, localPath, since string) ([]Commit, string, error) {
	if !validHashPattern.MatchString(since) {
		return nil, "", fmt.Errorf("%w: since must be a valid commit hash", ErrInvalidInput)
	}

	args := []string{"-C", localPath, "log", "--all", "--not", since, "--pretty=format:" + logFormat}
	commits, err := g.runLog(ctx, args)
	if err != nil {
		// Fallback to explicit range notation
		args = []string{"-C", localPath, "log", since + "..HEAD", "--pretty=format:" + logFormat}
		commits, err = g.runLog(ctx, args)
		if err != nil {
			return nil, "", err
		}
	}

	populatePRLinks(commits, owner, name)

	head, err := g.headCommit(ctx, localPath)
	if err != nil {
		return nil, "", err
	}

	return commits, head, nil
}

func (g *GitRepo) GetCommitDiff(ctx context.Context, localPath, hash string) (*CommitDiff, error) {
	if !validHashPattern.MatchString(hash) {
		return nil, fmt.Errorf("%w: hash must be a valid commit hash", ErrInvalidInput)
	}

	numstatOut, err := exec.CommandContext(ctx, "git", "-C", localPath, "show", "--numstat", "--format=", hash).Output()
	if err != nil {
		return nil, fmt.Errorf("commit not found: %w", ErrInvalidInput)
	}

	diffOut, err := exec.CommandContext(ctx, "git", "-C", localPath, "show", "--format=", hash).Output()
	if err != nil {
		return nil, fmt.Errorf("git show: %w", err)
	}

	return &CommitDiff{
		Hash:  hash,
		Files: parseNumstat(numstatOut),
		Diff:  strings.TrimPrefix(string(diffOut), "\n"),
	}, nil
}

func parseNumstat(data []byte) []FileStat {
	stats := make([]FileStat, 0)
	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		// numstat format: "<additions>\t<deletions>\t<path>"
		// Binary files use "-" instead of numbers.
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) != 3 {
			continue
		}
		additions, _ := strconv.Atoi(parts[0])
		deletions, _ := strconv.Atoi(parts[1])
		stats = append(stats, FileStat{
			Path:      parts[2],
			Additions: additions,
			Deletions: deletions,
		})
	}
	return stats
}

func (g *GitRepo) runLog(ctx context.Context, args []string) ([]Commit, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git log: %w: %s", err, stderr.String())
	}

	return parseGitLog(&stdout)
}

func parseGitLog(buf *bytes.Buffer) ([]Commit, error) {
	commits := make([]Commit, 0)
	scanner := bufio.NewScanner(buf)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "\x1f", 5)
		if len(parts) != 5 {
			continue
		}

		ts, err := strconv.ParseInt(strings.TrimSpace(parts[3]), 10, 64)
		if err != nil {
			continue
		}

		var parents []string
		if raw := strings.TrimSpace(parts[1]); raw != "" {
			parents = strings.Fields(raw)
		} else {
			parents = []string{}
		}

		commits = append(commits, Commit{
			Hash:      parts[0],
			Parents:   parents,
			Author:    parts[2],
			Timestamp: ts,
			Message:   parts[4],
		})
	}

	return commits, scanner.Err()
}
