import {
  Button,
  Checkbox,
  Code,
  Group,
  List,
  Modal,
  Stack,
  Text,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { getReferencePathsAction } from "@/actions/getReferencePathsAction"
import { type BookWithRelations } from "@/database/books"
import { useDeleteBookMutation } from "@/store/api"

interface Props {
  isOpen: boolean
  onClose: () => void
  book: BookWithRelations
}

export function DeleteBookModal({ isOpen, onClose, book }: Props) {
  const [deleteBook] = useDeleteBookMutation()

  const form = useForm({
    initialValues: {
      preventReImport: false,
    },
  })

  const candidatePaths = useMemo(
    () =>
      [
        book.ebook?.filepath,
        book.audiobook?.filepath,
        book.readaloud?.filepath,
      ].filter((p): p is string => !!p),
    [book],
  )

  const [referencePaths, setReferencePaths] = useState<string[] | null>(null)

  useEffect(() => {
    if (!isOpen || candidatePaths.length === 0) {
      setReferencePaths(null)
      return
    }
    let cancelled = false
    void getReferencePathsAction(candidatePaths).then((result) => {
      if (!cancelled) setReferencePaths(result)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, candidatePaths])

  const router = useRouter()
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Deleting book"
      centered
      size="sm"
    >
      <Stack>
        <Text>
          Are you sure you want to delete <strong>{book.title}</strong> by{" "}
          {book.authors[0]?.name}?
        </Text>
        <Text size="sm" c="dimmed">
          Files in your assets folder will be deleted. Files in your watch
          folders (reference imports) are left on disk.
        </Text>
        {referencePaths && referencePaths.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              These files will remain on disk:
            </Text>
            <List size="sm" spacing={4}>
              {referencePaths.map((p) => (
                <List.Item key={p}>
                  <Code>{p}</Code>
                </List.Item>
              ))}
            </List>
          </Stack>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={form.onSubmit(async ({ preventReImport }) => {
            await deleteBook({
              uuid: book.uuid,
              preventReImport,
            })
            router.back()
          })}
        >
          <Checkbox
            label="Prevent this book from being re-imported"
            {...form.getInputProps("preventReImport", { type: "checkbox" })}
          />

          <Group justify="space-between">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button color="red" type="submit">
              Delete
            </Button>
          </Group>
        </form>
      </Stack>
    </Modal>
  )
}
