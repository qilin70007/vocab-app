import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio
import base64

async def ocr_image(image_path):
    from Windows.Media.Ocr import OcrEngine
    from Windows.Graphics.Imaging import BitmapDecoder, SoftwareBitmap
    from Windows.Storage import StorageFile, FileAccessMode
    from Windows.Storage.Streams import DataReader
    
    # Load file
    file = await StorageFile.get_file_from_path_async(image_path)
    stream = await file.open_async(FileAccessMode.read)
    
    decoder = await BitmapDecoder.create_async(stream)
    bitmap = await decoder.get_software_bitmap_async()
    
    engine = OcrEngine.try_create_from_language(None)
    result = await engine.recognize_async(bitmap)
    
    return result.text

async def main():
    img1 = r'C:\Users\zhangpeilan\.qclaw\media\inbound\paste_1782227409633_dxko2n__orig_image.png'
    img2 = r'C:\Users\zhangpeilan\.qclaw\media\inbound\paste_1782227424027_7q6c7u__orig_image.png'
    
    print('=== Image 1 ===')
    text1 = await ocr_image(img1)
    print(text1)
    print()
    print('=== Image 2 ===')
    text2 = await ocr_image(img2)
    print(text2)

asyncio.run(main())
