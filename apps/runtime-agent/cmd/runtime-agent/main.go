package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/supabase/supabase/apps/runtime-agent/internal/server"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	log.Logger = logger

	cfg := server.ConfigFromEnv()
	srv := server.New(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info().
			Str("addr", cfg.ListenAddr).
			Msg("runtime-agent listening")

		if err := srv.Start(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server failed")
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Stop(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("graceful shutdown failed")
	}

	logger.Info().Msg("runtime-agent stopped")
}
