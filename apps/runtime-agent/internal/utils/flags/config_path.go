// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package flags

import (
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func LoadConfig(fsys afero.Fs) error {
	utils.Config.ProjectId = ProjectRef
	if err := utils.Config.Load("", utils.NewRootFS(fsys)); err != nil {
		return err
	}
	utils.UpdateDockerIds()
	return nil
}
