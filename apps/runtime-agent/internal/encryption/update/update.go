// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package update

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils/credentials"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/api"
)

func Run(ctx context.Context, projectRef string, stdin *os.File) error {
	fmt.Fprintf(os.Stderr, "Enter a new root key: ")
	input := credentials.PromptMasked(stdin)
	resp, err := utils.GetSupabase().V1UpdatePgsodiumConfigWithResponse(ctx, projectRef, api.UpdatePgsodiumConfigBody{
		RootKey: strings.TrimSpace(input),
	})
	if err != nil {
		return errors.Errorf("failed to update pgsodium config: %w", err)
	}

	if resp.JSON200 == nil {
		return errors.New("Unexpected error updating project root key: " + string(resp.Body))
	}

	fmt.Println("Finished " + utils.Aqua("supabase root-key update") + ".")
	return nil
}
