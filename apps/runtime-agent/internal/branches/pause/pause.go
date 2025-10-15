// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package pause

import (
	"context"
	"net/http"

	"github.com/go-errors/errors"
	"github.com/google/uuid"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils/flags"
)

func Run(ctx context.Context, branchId string) error {
	projectRef, err := GetBranchProjectRef(ctx, branchId)
	if err != nil {
		return err
	}
	if resp, err := utils.GetSupabase().V1PauseAProjectWithResponse(ctx, projectRef); err != nil {
		return errors.Errorf("failed to pause branch: %w", err)
	} else if resp.StatusCode() != http.StatusOK {
		return errors.Errorf("unexpected pause branch status %d: %s", resp.StatusCode(), string(resp.Body))
	}
	return nil
}

func GetBranchProjectRef(ctx context.Context, branchId string) (string, error) {
	if utils.ProjectRefPattern.Match([]byte(branchId)) {
		return branchId, nil
	}
	if err := uuid.Validate(branchId); err == nil {
		resp, err := utils.GetSupabase().V1GetABranchConfigWithResponse(ctx, branchId)
		if err != nil {
			return "", errors.Errorf("failed to get branch: %w", err)
		} else if resp.JSON200 == nil {
			return "", errors.Errorf("unexpected get branch status %d: %s", resp.StatusCode(), string(resp.Body))
		}
		return resp.JSON200.Ref, nil
	}
	resp, err := utils.GetSupabase().V1GetABranchWithResponse(ctx, flags.ProjectRef, branchId)
	if err != nil {
		return "", errors.Errorf("failed to find branch: %w", err)
	} else if resp.JSON200 == nil {
		return "", errors.Errorf("unexpected find branch status %d: %s", resp.StatusCode(), string(resp.Body))
	}
	return resp.JSON200.ProjectRef, nil
}
