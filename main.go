package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/v1/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello from GoLang",
		})
	})

	r.Run(":80")
}