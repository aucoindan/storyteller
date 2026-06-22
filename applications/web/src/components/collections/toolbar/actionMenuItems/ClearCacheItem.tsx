import { Button, Group, MenuItem, Modal, Stack, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { IconTrashX } from "@tabler/icons-react"

import { type BookWithRelations } from "@/database/books"
import { useClearBooksCacheMutation, useListBooksQuery } from "@/store/api"
import { type UUID } from "@/uuid"

import { TitleSummary } from "./TitleSummary"

const EMPTY_BOOKS: BookWithRelations[] = []

interface Props {
  selected: Set<UUID>
}

export function ClearCacheItem({ selected }: Props) {
  const [isOpen, { open, close }] = useDisclosure()
  const [clearBooksCache, { isLoading }] = useClearBooksCacheMutation()

  const { books } = useListBooksQuery(undefined, {
    selectFromResult: (result) => ({
      books:
        result.data?.filter((book) => selected.has(book.uuid)) ?? EMPTY_BOOKS,
    }),
  })

  return (
    <>
      <Modal
        opened={isOpen}
        onClose={close}
        title="Clear processed cache"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Delete processed audio and transcription files for{" "}
            <TitleSummary books={books} />?
          </Text>
          <Text size="sm" c="dimmed">
            This frees disk space but means a full restart is needed to re-align
            these books later. Original files are left untouched.
          </Text>
          <Group justify="space-between">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={isLoading}
              onClick={() => {
                void clearBooksCache({ bookUuids: [...selected] }).then(close)
              }}
            >
              Clear cache
            </Button>
          </Group>
        </Stack>
      </Modal>
      <MenuItem
        leftSection={<IconTrashX size={14} className="text-red-600" />}
        onClick={open}
      >
        Clear processed cache
      </MenuItem>
    </>
  )
}
