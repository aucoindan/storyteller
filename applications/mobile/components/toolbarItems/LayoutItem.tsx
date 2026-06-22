import { Columns2, ScrollText } from "lucide-react-native"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  useGetGlobalPreferencesQuery,
  useUpdateGlobalPreferenceMutation,
} from "@/store/localApi"

export function LayoutItem() {
  const { data: preferences } = useGetGlobalPreferencesQuery()
  const [updateGlobalPreference] = useUpdateGlobalPreferenceMutation()

  const isScrollLayout = preferences?.layout.scroll ?? false
  const nextLayout = isScrollLayout ? "page" : "scroll"

  return (
    <Button
      accessibilityLabel={
        isScrollLayout
          ? "Reader layout: scroll. Switch to page layout"
          : "Reader layout: page. Switch to scroll layout"
      }
      accessibilityState={{ selected: isScrollLayout }}
      variant="ghost"
      size="icon"
      disabled={!preferences}
      onPress={() => {
        if (!preferences) return

        updateGlobalPreference({
          name: "layout",
          value: {
            ...preferences.layout,
            scroll: nextLayout === "scroll",
          },
        })
      }}
    >
      <Icon as={isScrollLayout ? ScrollText : Columns2} size={24} />
    </Button>
  )
}
