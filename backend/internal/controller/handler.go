package controller

import (
	"errors"
	"net/http"
	"strconv"

	"git-visualizer/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func (ct *Controller) getGraph(c *gin.Context) {
	owner := c.Query("owner")
	name := c.Query("name")

	if owner == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name query params are required"})
		return
	}

	limitStr := c.DefaultQuery("limit", "1000")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 1000
	}

	graph, err := ct.service.GetGraph(c.Request.Context(), owner, name, limit)
	if err != nil {
		ct.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, graph)
}

func (ct *Controller) getUpdates(c *gin.Context) {
	owner := c.Query("owner")
	name := c.Query("name")
	since := c.Query("since")

	if owner == "" || name == "" || since == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner, name, and since query params are required"})
		return
	}

	updates, err := ct.service.GetUpdates(c.Request.Context(), owner, name, since)
	if err != nil {
		ct.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, updates)
}

func (ct *Controller) refreshGraph(c *gin.Context) {
	owner := c.Query("owner")
	name := c.Query("name")

	if owner == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name query params are required"})
		return
	}

	graph, err := ct.service.RefreshGraph(c.Request.Context(), owner, name)
	if err != nil {
		ct.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, graph)
}

func (ct *Controller) getCommitDiff(c *gin.Context) {
	owner := c.Query("owner")
	name := c.Query("name")
	hash := c.Query("hash")

	if owner == "" || name == "" || hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner, name, and hash query params are required"})
		return
	}

	diff, err := ct.service.GetCommitDiff(c.Request.Context(), owner, name, hash)
	if err != nil {
		ct.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, diff)
}

func (ct *Controller) handleServiceError(c *gin.Context, err error) {
	ct.logger.Error("service error", zap.Error(err))

	switch {
	case errors.Is(err, service.ErrBadRequest):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}
