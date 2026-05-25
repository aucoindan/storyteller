import { Button, Group, Modal, NativeSelect, Stack } from "@mantine/core"
import { useState } from "react"

import { type DirectoryFileEntry } from "@/actions/listDirectoryAction"
import { type Collection } from "@/database/collections"
import { type ImportMode } from "@/database/settingsTypes"
import { useCreateBookMutation } from "@/store/api"

import { ServerFileBrowser } from "./ServerFileBrowser"

const IMPORT_MODE_OPTIONS: { value: ImportMode; label: string }[] = [
  { value: "reference", label: "Reference in place" },
  { value: "copy", label: "Copy to library" },
  { value: "move", label: "Move to library" },
  { value: "hardlink", label: "Hard link to library" },
]

interface Props {
  isOpen: boolean
  collection: Collection | undefined
  onClose: () => void
}

export function ImportServerBooksModal({ isOpen, collection, onClose }: Props) {
  const [createBookMutation, { isLoading }] = useCreateBookMutation()

  const [values, setValues] = useState<DirectoryFileEntry[]>([])
  const [importMode, setImportMode] = useState<ImportMode>("reference")

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        setValues([])
        onClose()
      }}
      title="Import books from server"
      size="xl"
      classNames={{
        body: "flex h-[calc(100%-60px)] flex-col",
      }}
    >
      <ServerFileBrowser
        accept=".epub,.m4b,.m4a,.zip,audio/*,video/*,application/epub+zip"
        multiple
        value={values}
        onChange={setValues}
      />

      <div className="sticky bottom-0 -mx-4 mt-2 -mb-4 border-t bg-white px-4 py-3 dark:border-neutral-500 dark:bg-neutral-800">
        <Stack gap="xs">
          <NativeSelect
            size="sm"
            label="Import mode"
            value={importMode}
            onChange={(event) => {
              setImportMode(event.currentTarget.value as ImportMode)
            }}
            style={{ maxWidth: 240 }}
          >
            {IMPORT_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>

          <Group justify="flex-end">
            <Button
              variant="filled"
              disabled={isLoading || values.length === 0}
              loading={isLoading}
              onClick={async () => {
                await createBookMutation({
                  paths: values.map((value) => value.path),
                  collection: collection?.uuid,
                  importMode,
                })

                setValues([])
                onClose()
              }}
            >
              Import {values.length > 0 ? `(${values.length})` : ""}
            </Button>
          </Group>
        </Stack>
      </div>
    </Modal>
  )
}
