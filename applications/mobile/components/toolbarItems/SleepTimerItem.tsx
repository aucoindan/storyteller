import {
  addMinutes,
  addSeconds,
  intervalToDuration,
  isFuture,
  isPast,
} from "date-fns"
import { ClockFading } from "lucide-react-native"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Menu, type MenuAction } from "@/components/ui/menu"
import { Text } from "@/components/ui/text"
import { useAppDispatch, useAppSelector } from "@/store/appState"
import { getSleepTimer } from "@/store/selectors/bookshelfSelectors"
import { bookshelfSlice } from "@/store/slices/bookshelfSlice"

function formatSleepTimer(sleepTimer: Date) {
  const duration = intervalToDuration({
    start: new Date(),
    end: sleepTimer,
  })
  const minutes = String(
    (duration.minutes ?? 0) + (duration.hours ? duration.hours * 60 : 0),
  ).padStart(2, "0")
  const seconds = String(duration.seconds ?? 0).padStart(2, "0")
  return `${minutes}:${seconds}`
}

const MAX_FONT_SCALE = 1.75

export function SleepTimerItem() {
  const dispatch = useAppDispatch()
  const sleepTimer = useAppSelector(getSleepTimer)

  const [formattedSleepTimer, setFormattedSleepTimer] = useState<string | null>(
    sleepTimer && isFuture(sleepTimer) ? formatSleepTimer(sleepTimer) : null,
  )

  useEffect(() => {
    if (sleepTimer) {
      const intervalId = setInterval(() => {
        if (isPast(sleepTimer)) {
          clearInterval(intervalId)
          setFormattedSleepTimer(null)
          return
        }
        setFormattedSleepTimer(formatSleepTimer(sleepTimer))
      }, 500)
      return () => clearInterval(intervalId)
    } else {
      setFormattedSleepTimer(null)
    }
    return () => {}
  }, [sleepTimer])

  const menuActions: MenuAction[] = [
    {
      id: "off",
      title: "Off",
      onPress: () => {
        dispatch(bookshelfSlice.actions.sleepTimerSet({ sleepTimer: null }))
      },
    },
    ...[5, 10, 15, 30, 45, 60, 90, 120].map((minutes) => ({
      id: `${minutes}-min`,
      title: `${minutes} min`,
      onPress: () => {
        dispatch(
          bookshelfSlice.actions.sleepTimerSet({
            sleepTimer: addMinutes(new Date(), minutes),
          }),
        )
      },
    })),
    ...(__DEV__
      ? [
          {
            id: "5-sec",
            title: "5 sec",
            onPress: () => {
              dispatch(
                bookshelfSlice.actions.sleepTimerSet({
                  sleepTimer: addSeconds(new Date(), 5),
                }),
              )
            },
          },
          {
            id: "30-sec",
            title: "30 sec",
            onPress: () => {
              dispatch(
                bookshelfSlice.actions.sleepTimerSet({
                  sleepTimer: addSeconds(new Date(), 30),
                }),
              )
            },
          },
        ]
      : []),
  ]

  return (
    <Menu actions={menuActions}>
      <Button
        accessibilityLabel={
          formattedSleepTimer
            ? `Sleep timer, ${formattedSleepTimer} remaining`
            : "Open sleep timer menu"
        }
        variant="ghost"
        size="icon"
        className="h-10 w-12 sm:h-9 sm:w-11"
      >
        {formattedSleepTimer ? (
          <Text minimumFontScale={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {formattedSleepTimer}
          </Text>
        ) : (
          <Icon as={ClockFading} size={24} />
        )}
      </Button>
    </Menu>
  )
}
