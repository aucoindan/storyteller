package expo.modules.wallpaper

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.OutputStream

class WallpaperModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Wallpaper")

        AsyncFunction("setAsLockScreen") { imageUri: String ->
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")

            val uri = Uri.parse(imageUri)
            val bitmap: Bitmap = if (uri.scheme == "file" || uri.scheme == null) {
                val filePath = uri.path ?: imageUri
                FileInputStream(File(filePath)).use { fis ->
                    BitmapFactory.decodeStream(fis)
                }
            } else {
                context.contentResolver.openInputStream(uri)?.use { inputStream ->
                    BitmapFactory.decodeStream(inputStream)
                }
            } ?: throw Exception("Failed to load image")

            val resolver: ContentResolver = context.contentResolver
            val contentValues = ContentValues().apply {
                val fileName = "storyteller_cover_${System.currentTimeMillis()}.png"
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Storyteller")
            }

            val savedUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                ?: throw Exception("Failed to create image file")

            resolver.openOutputStream(savedUri)?.use { outputStream: OutputStream ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            } ?: throw Exception("Failed to open output stream")

            bitmap.recycle()

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(savedUri, "image/png")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            return@AsyncFunction try {
                context.startActivity(intent)
                "Image saved to gallery. Please long-press the image and select 'Set as screensaver' or 'Set as stop image'"
            } catch (e: Exception) {
                "Image saved to Pictures/Storyteller folder. Please open Gallery, long-press the image, and select 'Set as screensaver' or 'Set as stop image'"
            }
        }
    }
}
