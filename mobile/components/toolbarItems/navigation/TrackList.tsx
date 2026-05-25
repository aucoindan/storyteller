import { skipToken } from "@reduxjs/toolkit/query"
import { type RefObject, useRef } from "react"
import { View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { useSafeAreaFrame } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useSpacingVariable } from "@/hooks/useSpacingVariable"
import { cn } from "@/lib/utils"
import {
  AUDIOBOOK_TOC_LOOKAHEAD_SECONDS,
  getAudiobookTocItemAtPosition,
} from "@/modules/readium"
import { type ReadiumLink } from "@/modules/readium/src/Readium.types"
import { playerTrackChanged } from "@/store/actions"
import { useAppDispatch, useAppSelector } from "@/store/appState"
import { useGetBookQuery } from "@/store/localApi"
import {
  getCurrentTrackIndex,
  getCurrentlyPlayingBookUuid,
  getCurrentlyPlayingFormat,
  getPosition,
  getTracks,
} from "@/store/selectors/bookshelfSelectors"

interface Props {
  onClose?: () => void
}

export function TrackLisk({ onClose }: Props) {
  const ref = useRef<null | ScrollView>(null)
  const currentItemRef = useRef<null | View>(null)

  const bookUuid = useAppSelector(getCurrentlyPlayingBookUuid)
  const format = useAppSelector(getCurrentlyPlayingFormat) ?? "readaloud"

  const currentTrackIndex = useAppSelector(getCurrentTrackIndex)
  const position = useAppSelector(getPosition)

  const { data: book } = useGetBookQuery(
    bookUuid ? { uuid: bookUuid } : skipToken,
  )

  const tracks = useAppSelector(getTracks)

  const fromTracks = tracks.map(
    (track) =>
      ({
        href: track.relativeUri + "#t=0",
        title: track.title,
      }) as ReadiumLink,
  )

  const manifest =
    format === "audiobook"
      ? book?.audiobook?.manifest
      : book?.readaloud?.audioManifest

  const listing = manifest?.toc ?? fromTracks

  const frame = useSafeAreaFrame()

  const maxHeight = frame.height - useSpacingVariable(72)

  const currentTocItem = manifest?.toc
    ? getAudiobookTocItemAtPosition(
        manifest,
        currentTrackIndex,
        position + AUDIOBOOK_TOC_LOOKAHEAD_SECONDS,
      )
    : listing[currentTrackIndex]

  if (!book) return null

  return (
    <ScrollView
      ref={ref}
      style={{ maxHeight }}
      onLayout={() => {
        if (!ref.current) return
        // @ts-expect-error ScrollView is a perfectly valid component, not sure what
        // exactly the issue is here
        currentItemRef.current?.measureLayout(ref.current, (_x, y) => {
          ref.current?.scrollTo({
            y: y - 40,
            animated: false,
          })
        })
      }}
    >
      <Sublist
        listing={listing}
        currentTocItem={currentTocItem ?? undefined}
        currentItemRef={currentItemRef}
        onClose={onClose}
      />
    </ScrollView>
  )
}

function Sublist({
  listing,
  currentTocItem,
  currentItemRef,
  onClose,
}: {
  listing: ReadiumLink[]
  currentTocItem: ReadiumLink | undefined
  currentItemRef: RefObject<View | null>
  onClose?: (() => void) | undefined
}) {
  const dispatch = useAppDispatch()

  return (
    <>
      {listing.map((link) => (
        <View
          collapsable={false}
          key={link.href}
          {...(link === currentTocItem && {
            ref: currentItemRef,
          })}
          style={{ paddingHorizontal: 8 }}
        >
          <Button
            variant={link === currentTocItem ? "secondary" : "ghost"}
            className={cn(
              "h-auto justify-start border-b border-b-gray-400 p-4 sm:h-auto",
              {
                "bg-secondary": 0,
              },
            )}
            onPress={async () => {
              if (currentTocItem === link) return
              const [relativeUri, startPositionString] = link.href.split("#t=")
              const startPosition = parseFloat(startPositionString ?? "0")
              dispatch(
                playerTrackChanged({
                  relativeUri: relativeUri!,
                  position: startPosition,
                }),
              )
              onClose?.()
            }}
          >
            <Text className="text-sm font-bold">{link.title}</Text>
          </Button>
          <Sublist
            listing={link.children ?? []}
            currentTocItem={currentTocItem}
            currentItemRef={currentItemRef}
            onClose={onClose}
          />
        </View>
      ))}
    </>
  )
}
