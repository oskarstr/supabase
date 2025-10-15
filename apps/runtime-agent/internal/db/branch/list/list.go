// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package list

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/go-errors/errors"
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(fsys afero.Fs, out io.Writer) error {
	branches, err := afero.ReadDir(fsys, filepath.Dir(utils.CurrBranchPath))
	if errors.Is(err, os.ErrNotExist) {
		return nil
	} else if err != nil {
		return err
	}

	currBranch, _ := utils.GetCurrentBranchFS(fsys)
	for _, branch := range branches {
		if branch.Name() == filepath.Base(utils.CurrBranchPath) {
			continue
		}

		if branch.Name() == currBranch {
			fmt.Fprintln(out, "*", branch.Name())
		} else {
			fmt.Fprintln(out, " ", branch.Name())
		}
	}

	return nil
}
