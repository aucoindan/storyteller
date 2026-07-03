import { ActionIcon, Button, Group, Menu, Tooltip } from "@mantine/core"
import {
  IconDotsVertical,
  IconKey,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"

import { type User } from "@/apiModels"
import {
  useDeleteUserMutation,
  useGetCurrentUserQuery,
  useSendPasswordResetMutation,
} from "@/store/api"

type Props = {
  user: User
  onEdit: () => void
}

export function UserActions({ user, onEdit }: Props) {
  const { permissions } = useGetCurrentUserQuery(undefined, {
    selectFromResult: (result) => ({
      permissions: result.data?.permissions,
    }),
  })

  const [deleteUser] = useDeleteUserMutation()
  const [sendPasswordReset] = useSendPasswordResetMutation()

  const showMenu = !!permissions?.userPasswordReset || !!permissions?.userDelete

  return (
    <Group gap="xs" wrap="nowrap">
      {permissions?.userUpdate && (
        <Button
          leftSection={<IconPencil size={16} aria-hidden />}
          onClick={onEdit}
        >
          Edit
        </Button>
      )}
      {showMenu && (
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="default" aria-label="More actions">
              <Tooltip position="right" label="More actions">
                <IconDotsVertical aria-hidden />
              </Tooltip>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {permissions.userPasswordReset && (
              <Menu.Item
                leftSection={<IconKey size={16} aria-hidden />}
                onClick={() => {
                  void sendPasswordReset({ userId: user.id })
                }}
              >
                Send password reset
              </Menu.Item>
            )}
            {permissions.userPasswordReset && permissions.userDelete && (
              <Menu.Divider />
            )}
            {permissions.userDelete && (
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} aria-hidden />}
                onClick={async () => {
                  await deleteUser({ uuid: user.id })
                }}
              >
                Delete user
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  )
}
