// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package apply

import (
	"context"

	"github.com/jackc/pgx/v4"
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/migration/list"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/migration"
)

func MigrateAndSeed(ctx context.Context, version string, conn *pgx.Conn, fsys afero.Fs) error {
	if err := applyMigrationFiles(ctx, version, conn, fsys); err != nil {
		return err
	}
	return applySeedFiles(ctx, conn, fsys)
}

func applyMigrationFiles(ctx context.Context, version string, conn *pgx.Conn, fsys afero.Fs) error {
	if !utils.Config.Db.Migrations.Enabled {
		return nil
	}
	migrations, err := list.LoadPartialMigrations(version, fsys)
	if err != nil {
		return err
	}
	return migration.ApplyMigrations(ctx, migrations, conn, afero.NewIOFS(fsys))
}

func applySeedFiles(ctx context.Context, conn *pgx.Conn, fsys afero.Fs) error {
	if !utils.Config.Db.Seed.Enabled {
		return nil
	}
	seeds, err := migration.GetPendingSeeds(ctx, utils.Config.Db.Seed.SqlPaths, conn, afero.NewIOFS(fsys))
	if err != nil {
		return err
	}
	return migration.SeedData(ctx, seeds, conn, afero.NewIOFS(fsys))
}
