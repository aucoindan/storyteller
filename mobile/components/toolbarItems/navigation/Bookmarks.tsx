import { skipToken } from "@reduxjs/toolkit/query"
import { Trash2 } from "lucide-react-native"
import { useMemo } from "react"
import { View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"

import { Stack } from "@/components/ui/Stack"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { getHrefChapterTitle, positionToPageCount } from "@/links"
import { getAudiobookLocatorDetails } from "@/modules/readium"
import { bookmarkPressed } from "@/store/actions"
import { useAppDispatch, useAppSelector } from "@/store/appState"
import {
  useDeleteBookmarksMutation,
  useGetBookBookmarksQuery,
  useGetBookPositionsQuery,
  useGetBookQuery,
} from "@/store/localApi"
import {
  formatTime,
  getCurrentlyPlayingBookUuid,
  getCurrentlyPlayingFormat,
} from "@/store/selectors/bookshelfSelectors"

export function Bookmarks() {
  const bookUuid = useAppSelector(getCurrentlyPlayingBookUuid)
  const format = useAppSelector(getCurrentlyPlayingFormat)
  const dispatch = useAppDispatch()
  const { data: bookmarks } = useGetBookBookmarksQuery(
    bookUuid ? { bookUuid } : skipToken,
  )
  const { data: book } = useGetBookQuery(
    bookUuid ? { uuid: bookUuid } : skipToken,
  )
  const [deleteBookmarks] = useDeleteBookmarksMutation()

  const sortedBookmarks = useMemo(() => {
    return [...(bookmarks ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }, [bookmarks])

  const toc =
    format === "readaloud"
      ? book?.readaloud?.epubManifest?.toc
      : format === "ebook"
        ? book?.ebook?.manifest?.toc
        : undefined

  const bookmarkTitles = useMemo(() => {
    return sortedBookmarks.map((bookmark) => {
      return (
        (toc ? getHrefChapterTitle(bookmark.locator.href, toc) : null) ??
        bookmark.locator.title ??
        "Untitled chapter"
      )
    })
  }, [sortedBookmarks, toc])

  const { data: positions } = useGetBookPositionsQuery(
    bookUuid && (format === "readaloud" || format === "ebook")
      ? { bookUuid, format }
      : skipToken,
  )

  const bookmarkPages = useMemo(() => {
    if (!positions) return []

    return sortedBookmarks.map((bookmark) => {
      const chapterPositions = positions.filter(
        (position) => position.href === bookmark.locator.href,
      )
      const bookmarkPosition =
        (chapterPositions.findIndex(
          (position) =>
            (position.locations?.progression ?? 0) >=
            (bookmark.locator.locations?.progression ?? 0),
        ) ?? 0) + 1

      const bookmarkPage = positionToPageCount(bookmarkPosition)
      return bookmarkPage
    })
  }, [positions, sortedBookmarks])

  const audiobookBookmarkDetails = useMemo(() => {
    if (format !== "audiobook") return []

    return sortedBookmarks.map((bookmark) =>
      getAudiobookLocatorDetails(bookmark.locator, book?.audiobook?.manifest),
    )
  }, [book?.audiobook?.manifest, format, sortedBookmarks])

  const audiobookBookmarkTimestamps = useMemo(() => {
    if (format !== "audiobook") return []

    return (
      audiobookBookmarkDetails.map((details) =>
        formatTime(details.timestamp),
      ) ?? []
    )
  }, [audiobookBookmarkDetails, format])

  if (!bookmarks || !bookUuid) return null

  if (!bookmarks.length) {
    return (
      <Stack className="p-8">
        <Text className="text-muted-foreground">
          No bookmarks yet! Try adding some by pressing the bookmark icon in the
          toolbar.
        </Text>
      </Stack>
    )
  }

  return (
    <ScrollView>
      {sortedBookmarks.map((bookmark, index) => (
        <Swipeable
          key={bookmark.uuid}
          renderRightActions={() => (
            <Button
              className="align-center h-full w-20 justify-center bg-red-500 sm:h-full sm:w-20"
              variant="destructive"
              onPress={() => {
                deleteBookmarks({
                  bookUuid: bookmark.bookUuid,
                  bookmarkUuids: [bookmark.uuid],
                })
              }}
            >
              <Icon as={Trash2} size={24} className="text-white" />
            </Button>
          )}
        >
          <View className="bg-background px-2">
            <Button
              onPress={() => {
                dispatch(
                  bookmarkPressed({
                    bookUuid,
                    locator: bookmark.locator,
                    timestamp: Date.now(),
                  }),
                )
              }}
              variant="ghost"
              className="h-auto flex-col items-start border-b border-b-gray-400 p-4 sm:h-auto"
            >
              {format === "audiobook" ? (
                <>
                  <Text className="text-sm font-bold">
                    {audiobookBookmarkDetails[index]?.title}
                  </Text>
                  <Text className="mt-2 text-xs">
                    Timestamp {audiobookBookmarkTimestamps[index]}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-sm font-bold">
                    {bookmarkTitles[index]}
                  </Text>
                  <Text className="mt-2 text-xs">
                    Page {bookmarkPages[index]}
                  </Text>
                </>
              )}
            </Button>
          </View>
        </Swipeable>
      ))}
    </ScrollView>
  )
}
