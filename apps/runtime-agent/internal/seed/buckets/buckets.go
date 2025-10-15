// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package buckets

import (
	"context"
	"fmt"

	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/storage/client"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, projectRef string, interactive bool, fsys afero.Fs) error {
	api, err := client.NewStorageAPI(ctx, projectRef)
	if err != nil {
		return err
	}
	console := utils.NewConsole()
	if !interactive {
		console.IsTTY = false
	}
	filter := func(bucketId string) bool {
		label := fmt.Sprintf("Bucket %s already exists. Do you want to overwrite its properties?", utils.Bold(bucketId))
		shouldOverwrite, err := console.PromptYesNo(ctx, label, true)
		if err != nil {
			fmt.Fprintln(utils.GetDebugLogger(), err)
		}
		return shouldOverwrite
	}
	if err := api.UpsertBuckets(ctx, utils.Config.Storage.Buckets, filter); err != nil {
		return err
	}
	return api.UpsertObjects(ctx, utils.Config.Storage.Buckets, utils.NewRootFS(fsys))
}
