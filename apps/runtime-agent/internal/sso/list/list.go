// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package list

import (
	"context"
	"net/http"
	"os"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/sso/internal/render"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, ref, format string) error {
	resp, err := utils.GetSupabase().V1ListAllSsoProviderWithResponse(ctx, ref)
	if err != nil {
		return errors.Errorf("failed to list sso providers: %w", err)
	}

	if resp.JSON200 == nil {
		if resp.StatusCode() == http.StatusNotFound {
			return errors.New("Looks like SAML 2.0 support is not enabled for this project. Please use the dashboard to enable it.")
		}

		return errors.New("unexpected error listing identity providers: " + string(resp.Body))
	}

	switch format {
	case utils.OutputPretty:
		return render.ListMarkdown(*resp.JSON200)

	default:
		return utils.EncodeOutput(format, os.Stdout, map[string]any{
			"providers": resp.JSON200.Items,
		})
	}
}
