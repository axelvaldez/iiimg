import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const EXPORT_DIR = path.join(__dirname, 'exports')
const IMAGES_DIR = path.join(EXPORT_DIR, 'images')

async function exportData() {
  console.log('🚀 Starting export...\n')
  
  // Create export directories
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true })
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }

  try {
    // 1. Export metadata from database
    console.log('📊 Exporting metadata...')
    const { data: metadata, error: dbError } = await supabase
      .from('image_metadata')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (dbError) throw dbError
    
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    )
    console.log(`✅ Exported ${metadata.length} metadata records\n`)

    // 2. Download all images
    console.log('📥 Downloading images...')
    let downloaded = 0
    let failed = 0

    for (const item of metadata) {
      try {
        // Download from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('images')
          .download(item.storage_path)
        
        if (downloadError) throw downloadError
        
        // Convert blob to buffer and save
        const buffer = Buffer.from(await fileData.arrayBuffer())
        
        // Preserve folder structure (e.g., images/2025/12/file.jpg -> exports/images/2025/12/file.jpg)
        const relativePath = item.storage_path.replace('images/', '')
        const filepath = path.join(IMAGES_DIR, relativePath)
        
        // Create year/month directories if needed
        const dirPath = path.dirname(filepath)
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
        }
        
        fs.writeFileSync(filepath, buffer)
        downloaded++
        
        // Show progress
        if (downloaded % 10 === 0) {
          console.log(`   Downloaded ${downloaded}/${metadata.length} images...`)
        }
      } catch (error) {
        console.error(`❌ Failed to download ${item.filename}:`, error.message)
        failed++
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(50))
    console.log('✨ Export Complete!')
    console.log('='.repeat(50))
    console.log(`📁 Location: ${EXPORT_DIR}`)
    console.log(`📷 Images downloaded: ${downloaded}`)
    if (failed > 0) {
      console.log(`⚠️  Failed: ${failed}`)
    }
    console.log(`📋 Metadata saved: metadata.json`)
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

// Run export
exportData()
