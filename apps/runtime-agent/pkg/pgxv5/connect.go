// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package pgxv5

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/go-errors/errors"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
)

// Extends pgx.Connect with support for programmatically overriding parsed config
func Connect(ctx context.Context, connString string, options ...func(*pgx.ConnConfig)) (*pgx.Conn, error) {
	// Parse connection url
	config, err := pgx.ParseConfig(connString)
	if err != nil {
		return nil, errors.Errorf("failed to parse connection string: %w", err)
	}
	config.OnNotice = func(pc *pgconn.PgConn, n *pgconn.Notice) {
		if !shouldIgnore(n.Message) {
			fmt.Fprintf(os.Stderr, "%s (%s): %s\n", n.Severity, n.Code, n.Message)
		}
	}
	// Apply config overrides
	for _, op := range options {
		op(config)
	}
	// Connect to database
	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		return nil, errors.Errorf("failed to connect to postgres: %w", err)
	}
	return conn, nil
}

func shouldIgnore(msg string) bool {
	return strings.Contains(msg, `schema "supabase_migrations" already exists`) ||
		strings.Contains(msg, `relation "schema_migrations" already exists`) ||
		strings.Contains(msg, `relation "seed_files" already exists`)
}
