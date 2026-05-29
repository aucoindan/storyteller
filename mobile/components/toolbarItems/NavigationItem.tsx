import { type TriggerRef } from "@rn-primitives/popover"
import { TableOfContentsIcon, Undo2Icon, X } from "lucide-react-native"
import { useRef, useState } from "react"
import { TouchableOpacity, View } from "react-native"
import { useSafeAreaFrame } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Text } from "@/components/ui/text"
import { useSpacingVariable } from "@/hooks/useSpacingVariable"
import { clearReturnPosition, returnToPreviousPosition } from "@/store/actions"
import { useAppDispatch, useAppSelector } from "@/store/appState"
import {
  getCurrentlyPlayingBookUuid,
  getReturnToPosition,
} from "@/store/selectors/bookshelfSelectors"

import { Bookmarks } from "./navigation/Bookmarks"
import { Highlights } from "./navigation/Highlights"
import { TableOfContents } from "./navigation/TableOfContents"
import { TrackLisk } from "./navigation/TrackList"

interface Props {
  mode: "text" | "audio"
}

export function NavigationItem({ mode }: Props) {
  const [tab, setTab] = useState<string>("toc")
  const popoverRef = useRef<null | TriggerRef>(null)

  const frame = useSafeAreaFrame()
  const bookUuid = useAppSelector(getCurrentlyPlayingBookUuid)
  const returnToPos = useAppSelector((state) =>
    bookUuid ? getReturnToPosition(state, bookUuid) : null,
  )
  const dispatch = useAppDispatch()

  return (
    <Popover>
      <PopoverTrigger ref={popoverRef} className="items-center" asChild>
        <Button variant="ghost" size="icon">
          <Icon as={TableOfContentsIcon} size={24} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{
          maxHeight: frame.height - useSpacingVariable(40),
        }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="toc">
              <Text maxFontSizeMultiplier={1}>Contents</Text>
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              <Text maxFontSizeMultiplier={1}>Bookmarks</Text>
            </TabsTrigger>
            <TabsTrigger value="highlights">
              <Text maxFontSizeMultiplier={1}>Highlights</Text>
            </TabsTrigger>
          </TabsList>
          {returnToPos && bookUuid && (
            <View className="flex flex-row items-center justify-between">
              <TouchableOpacity
                className="flex h-auto flex-row items-start gap-2"
                onPress={() => {
                  dispatch(
                    returnToPreviousPosition({
                      bookUuid,
                      timestamp: Date.now(),
                    }),
                  )
                }}
              >
                <Icon as={Undo2Icon} size={16} className="text-foreground" />
                <Text className="text-sm font-bold">
                  Back to previous position
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  dispatch(
                    clearReturnPosition({
                      bookUuid,
                    }),
                  )
                }}
                accessibilityLabel="Dismiss return to previous position"
                hitSlop={12}
              >
                <Icon as={X} size={16} className="text-blue-900" />
              </TouchableOpacity>
            </View>
          )}
          <TabsContent value="toc">
            {mode === "text" ? (
              <TableOfContents
                onClose={() => {
                  popoverRef.current?.close()
                }}
              />
            ) : (
              <TrackLisk
                onClose={() => {
                  popoverRef.current?.close()
                }}
              />
            )}
          </TabsContent>
          <TabsContent value="bookmarks">
            <Bookmarks />
          </TabsContent>
          <TabsContent value="highlights">
            <Highlights />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
