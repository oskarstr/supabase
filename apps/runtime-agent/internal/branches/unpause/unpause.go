// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package unpause

import (
	"context"
	"net/http"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/branches/pause"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, branchId string) error {
	projectRef, err := pause.GetBranchProjectRef(ctx, branchId)
	if err != nil {
		return err
	}
	if resp, err := utils.GetSupabase().V1RestoreAProjectWithResponse(ctx, projectRef); err != nil {
		return errors.Errorf("failed to unpause branch: %w", err)
	} else if resp.StatusCode() != http.StatusOK {
		return errors.Errorf("unexpected unpause branch status %d: %s", resp.StatusCode(), string(resp.Body))
	}
	return nil
}
