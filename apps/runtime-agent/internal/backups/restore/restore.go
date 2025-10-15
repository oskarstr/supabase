// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package restore

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils/flags"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/api"
)

func Run(ctx context.Context, timestamp int64) error {
	body := api.V1RestorePitrBody{RecoveryTimeTargetUnix: timestamp}
	resp, err := utils.GetSupabase().V1RestorePitrBackupWithResponse(ctx, flags.ProjectRef, body)
	if err != nil {
		return errors.Errorf("failed to restore backup: %w", err)
	} else if resp.StatusCode() != http.StatusCreated {
		return errors.Errorf("unexpected restore backup status %d: %s", resp.StatusCode(), string(resp.Body))
	}
	fmt.Println("Started PITR restore:", flags.ProjectRef)
	return nil
}
