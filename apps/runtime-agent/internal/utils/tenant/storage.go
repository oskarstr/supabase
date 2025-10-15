// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package tenant

import (
	"context"
	"io"
	"net/http"

	"github.com/go-errors/errors"
)

var errStorageVersion = errors.New("Storage version not found.")

func (t *TenantAPI) GetStorageVersion(ctx context.Context) (string, error) {
	resp, err := t.Send(ctx, http.MethodGet, "/storage/v1/version", nil)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", errors.Errorf("failed to read response body: %w", err)
	}
	if len(data) == 0 || string(data) == "0.0.0" {
		return "", errors.New(errStorageVersion)
	}
	return "v" + string(data), nil
}
