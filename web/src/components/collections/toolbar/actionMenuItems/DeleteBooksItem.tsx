import {
  Button,
  Checkbox,
  Code,
  Group,
  List,
  MenuItem,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { useDisclosure } from "@mantine/hooks"
import { IconBooksOff } from "@tabler/icons-react"
import { useEffect, useMemo, useState } from "react"

import { getReferencePathsAction } from "@/actions/getReferencePathsAction"
import { type BookWithRelations } from "@/database/books"
import { usePermissions } from "@/hooks/usePermissions"
import { useDeleteBooksMutation, useListBooksQuery } from "@/store/api"
import { type UUID } from "@/uuid"

import { TitleSummary } from "./TitleSummary"

const EMPTY_BOOKS: BookWithRelations[] = []

interface Props {
  selected: Set<UUID>
  onCommit: () => void
}

export function DeleteBooksItem({ selected, onCommit }: Props) {
  const { books } = useListBooksQuery(undefined, {
    selectFromResult: (result) => ({
      books:
        result.data?.filter((book) => selected.has(book.uuid)) ?? EMPTY_BOOKS,
    }),
  })

  const [isOpen, { open, close }] = useDisclosure()

  const permissions = usePermissions()

  const [deleteBooks] = useDeleteBooksMutation()

  const form = useForm({
    initialValues: {
      preventReImport: false,
    },
  })

  const allCandidatePaths = useMemo(
    () =>
      books.flatMap((book) =>
        [
          book.ebook?.filepath,
          book.audiobook?.filepath,
          book.readaloud?.filepath,
        ].filter((p): p is string => !!p),
      ),
    [books],
  )

  const [externalPathSet, setExternalPathSet] = useState<Set<string> | null>(
    null,
  )

  useEffect(() => {
    if (!isOpen || allCandidatePaths.length === 0) {
      setExternalPathSet(null)
      return
    }
    let cancelled = false
    void getReferencePathsAction(allCandidatePaths).then((result) => {
      if (!cancelled) setExternalPathSet(new Set(result))
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, allCandidatePaths])

  const referenceGroups = useMemo(() => {
    if (!externalPathSet) return []
    return books
      .map((book) => ({
        uuid: book.uuid,
        title: book.title,
        paths: [
          book.ebook?.filepath,
          book.audiobook?.filepath,
          book.readaloud?.filepath,
        ].filter((p): p is string => !!p && externalPathSet.has(p)),
      }))
      .filter((group) => group.paths.length > 0)
  }, [books, externalPathSet])

  const totalReferenceFiles = referenceGroups.reduce(
    (sum, group) => sum + group.paths.length,
    0,
  )

  if (!permissions?.bookDelete) {
    return null
  }

  return (
    <>
      <Modal
        opened={isOpen}
        onClose={close}
        title="Deleting books"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <TitleSummary books={books} />?
          </Text>
          <Text size="sm" c="dimmed">
            Library-owned files will be deleted. Files in your watch folders
            (reference imports) are left on disk.
          </Text>
          {referenceGroups.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {totalReferenceFiles} file{totalReferenceFiles === 1 ? "" : "s"}{" "}
                across {referenceGroups.length} book
                {referenceGroups.length === 1 ? "" : "s"} will remain on disk:
              </Text>
              <ScrollArea.Autosize mah={200}>
                <Stack gap="xs">
                  {referenceGroups.map((group) => (
                    <Stack key={group.uuid} gap={2}>
                      <Text size="sm" fw={500}>
                        {group.title}
                      </Text>
                      <List size="sm" spacing={2}>
                        {group.paths.map((p) => (
                          <List.Item key={p}>
                            <Code>{p}</Code>
                          </List.Item>
                        ))}
                      </List>
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          )}
          <form
            className="flex flex-col gap-4"
            onSubmit={form.onSubmit(async ({ preventReImport }) => {
              onCommit()

              await deleteBooks({
                books: Array.from(selected),
                preventReImport,
              })
            })}
          >
            <Checkbox
              label="Prevent these books from being re-imported"
              {...form.getInputProps("preventReImport", { type: "checkbox" })}
            />

            <Group justify="space-between">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">Delete</Button>
            </Group>
          </form>
        </Stack>
      </Modal>
      <MenuItem
        leftSection={<IconBooksOff size={14} className="text-red-600" />}
        onClick={() => {
          open()
        }}
      >
        Delete books
      </MenuItem>
    </>
  )
}
