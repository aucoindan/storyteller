import { requireOptionalNativeModule } from "expo-modules-core"

interface WallpaperModuleInterface {
  setAsLockScreen(imageUri: string): Promise<string>
}

export default requireOptionalNativeModule<WallpaperModuleInterface>(
  "Wallpaper",
)
