import {
  type MenuAction as ExpoMenuAction,
  type MenuComponentRef,
  MenuView,
} from "@expo/ui/community/menu"
import {
  DropdownMenu,
  DropdownMenuItem,
  HorizontalDivider,
  Host,
  Icon as ComposeIcon,
  RNHostView,
  Text as ComposeText,
  useMaterialColors,
} from "@expo/ui/jetpack-compose"
import {
  type ComponentProps,
  type Ref,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Platform, Pressable, View } from "react-native"

export type MenuAction = Omit<ExpoMenuAction, "subactions"> & {
  onPress?: () => void
  subactions?: MenuAction[]
}
export type MenuRef = MenuComponentRef

type MenuProps = Omit<
  ComponentProps<typeof MenuView>,
  "actions" | "onPressAction" | "ref"
> & {
  androidManualTrigger?: boolean
  actions: MenuAction[]
  menuRef?: Ref<MenuRef>
}

function actionId(action: MenuAction): string {
  return action.id ?? action.title
}

function stripCallbacks(action: MenuAction): ExpoMenuAction {
  const { onPress: _onPress, subactions, ...menuAction } = action
  return {
    ...menuAction,
    ...(subactions ? { subactions: subactions.map(stripCallbacks) } : {}),
  }
}

function collectCallbacks(
  action: MenuAction,
  callbacks: Map<string, () => void>,
) {
  const id = action.id ?? action.title
  if (action.onPress) callbacks.set(id, action.onPress)
  action.subactions?.forEach((subaction) =>
    collectCallbacks(subaction, callbacks),
  )
}

function buildElementColors(
  action: MenuAction,
  destructiveColor: string,
): ComponentProps<typeof DropdownMenuItem>["elementColors"] {
  const isDestructive = action.attributes?.destructive === true
  const textColor =
    action.titleColor ?? (isDestructive ? destructiveColor : undefined)
  const leadingIconColor = isDestructive ? destructiveColor : undefined
  if (textColor == null && leadingIconColor == null) return undefined

  const elementColors: NonNullable<
    ComponentProps<typeof DropdownMenuItem>["elementColors"]
  > = {}

  if (textColor != null) {
    elementColors.textColor = textColor
    elementColors.disabledTextColor = textColor
  }

  if (leadingIconColor != null) {
    elementColors.leadingIconColor = leadingIconColor
    elementColors.disabledLeadingIconColor = leadingIconColor
  }

  return elementColors
}

function AndroidMenuActionItem({
  action,
  dismissAll,
  destructiveColor,
}: {
  action: MenuAction
  dismissAll: () => void
  destructiveColor: string
}) {
  const [submenuExpanded, setSubmenuExpanded] = useState(false)

  if (action.attributes?.hidden) return null

  const { subactions, displayInline, state, attributes, title, image } = action
  const leadingIconSource =
    typeof image === "string" || image == null ? null : image
  const elementColors = buildElementColors(action, destructiveColor)

  if (subactions && subactions.length > 0) {
    if (displayInline) {
      return (
        <>
          <HorizontalDivider />
          {subactions.map((subaction) => (
            <AndroidMenuActionItem
              key={actionId(subaction)}
              action={subaction}
              dismissAll={dismissAll}
              destructiveColor={destructiveColor}
            />
          ))}
          <HorizontalDivider />
        </>
      )
    }

    return (
      <DropdownMenu
        expanded={submenuExpanded}
        onDismissRequest={() => setSubmenuExpanded(false)}
      >
        <DropdownMenu.Trigger>
          <DropdownMenuItem
            enabled={!attributes?.disabled}
            onClick={() => setSubmenuExpanded(true)}
            {...(elementColors ? { elementColors } : {})}
          >
            <DropdownMenuItem.Text>
              <ComposeText>{title}</ComposeText>
            </DropdownMenuItem.Text>
            {leadingIconSource && (
              <DropdownMenuItem.LeadingIcon>
                <ComposeIcon
                  source={leadingIconSource}
                  size={24}
                  {...(action.imageColor == null
                    ? {}
                    : { tint: action.imageColor })}
                />
              </DropdownMenuItem.LeadingIcon>
            )}
          </DropdownMenuItem>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {subactions.map((subaction) => (
            <AndroidMenuActionItem
              key={actionId(subaction)}
              action={subaction}
              dismissAll={() => {
                setSubmenuExpanded(false)
                dismissAll()
              }}
              destructiveColor={destructiveColor}
            />
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenuItem
      enabled={!attributes?.disabled}
      onClick={() => {
        action.onPress?.()
        dismissAll()
      }}
      {...(elementColors ? { elementColors } : {})}
    >
      <DropdownMenuItem.Text>
        <ComposeText>{title}</ComposeText>
      </DropdownMenuItem.Text>
      {leadingIconSource && (
        <DropdownMenuItem.LeadingIcon>
          <ComposeIcon
            source={leadingIconSource}
            size={24}
            {...(action.imageColor == null ? {} : { tint: action.imageColor })}
          />
        </DropdownMenuItem.LeadingIcon>
      )}
      {state === "on" && (
        <DropdownMenuItem.TrailingIcon>
          <ComposeText>{"\u2713"}</ComposeText>
        </DropdownMenuItem.TrailingIcon>
      )}
    </DropdownMenuItem>
  )
}

function AndroidMenu({
  androidManualTrigger,
  actions,
  children,
  menuRef,
  onCloseMenu,
  onOpenMenu,
  shouldOpenOnLongPress,
  style,
  testID,
}: MenuProps) {
  const [expanded, setExpanded] = useState(false)
  const expandedRef = useRef(false)

  function open() {
    if (expandedRef.current) return
    expandedRef.current = true
    setExpanded(true)
    onOpenMenu?.()
  }

  function dismissAll() {
    if (!expandedRef.current) return
    expandedRef.current = false
    setExpanded(false)
    onCloseMenu?.()
  }

  useImperativeHandle(menuRef, () => ({ show: open }))

  const trigger = androidManualTrigger ? (
    <>{children}</>
  ) : (
    <Pressable
      {...(shouldOpenOnLongPress ? { onLongPress: open } : { onPress: open })}
      accessible={false}
      android_disableSound
      focusable={false}
    >
      {children}
    </Pressable>
  )

  const destructiveColor = useMaterialColors().error
  const viewProps = {
    ...(style == null ? {} : { style }),
    ...(testID == null ? {} : { testID }),
  }

  return (
    <View {...viewProps}>
      <Host matchContents>
        <DropdownMenu expanded={expanded} onDismissRequest={dismissAll}>
          <DropdownMenu.Trigger>
            <RNHostView matchContents>{trigger}</RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {actions.map((action) => (
              <AndroidMenuActionItem
                key={actionId(action)}
                action={action}
                dismissAll={dismissAll}
                destructiveColor={destructiveColor}
              />
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  )
}

function CommunityMenu({ actions, menuRef, ...props }: MenuProps) {
  const menuActions = actions.map(stripCallbacks)
  const callbacks = new Map<string, () => void>()
  actions.forEach((action) => collectCallbacks(action, callbacks))
  const refProps = menuRef ? { ref: menuRef } : {}

  return (
    <MenuView
      {...refProps}
      actions={menuActions}
      onPressAction={(event) => {
        callbacks.get(event.nativeEvent.event)?.()
      }}
      {...props}
    />
  )
}

export function Menu({
  actions,
  androidManualTrigger,
  menuRef,
  ...props
}: MenuProps) {
  const menuRefProps = menuRef ? { menuRef } : {}
  const androidManualTriggerProps = androidManualTrigger
    ? { androidManualTrigger }
    : {}

  if (Platform.OS === "android") {
    return (
      <AndroidMenu
        actions={actions}
        {...androidManualTriggerProps}
        {...menuRefProps}
        {...props}
      />
    )
  }

  return <CommunityMenu actions={actions} {...menuRefProps} {...props} />
}
