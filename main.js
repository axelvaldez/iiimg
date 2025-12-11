import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// State
let currentMonth = new Date() // Current month being viewed
let availableMonths = [] // List of months that have images
let isAuthenticated = false
let user = null

// DOM elements
const loginContainer = document.getElementById('loginContainer')
const mainContainer = document.getElementById('mainContainer')
const headerContainer = document.getElementById('headerContainer')
const headerWrapper = document.getElementById('headerWrapper')
const mainHeader = document.getElementById('mainHeader')
const authBtn = document.getElementById('authBtn')
const loginForm = document.getElementById('loginForm')
const loginError = document.getElementById('loginError')
const logoutBtn = document.getElementById('logoutBtn')
const uploadBanner = document.getElementById('uploadBanner')
const dragOverlay = document.getElementById('dragOverlay')
const dropZone = document.getElementById('dropZone')
const fileInput = document.getElementById('fileInput')
const gallery = document.getElementById('gallery')
const monthHeading = document.getElementById('monthHeading')
const pagination = document.getElementById('pagination')
const prevBtn = document.getElementById('prevBtn')
const nextBtn = document.getElementById('nextBtn')
const pageInfo = document.getElementById('pageInfo')
const overlay = document.getElementById('overlay')
const overlayImage = document.getElementById('overlayImage')
const overlayClose = document.getElementById('overlayClose')
const toast = document.getElementById('toast')

// Initialize
init()

async function init() {
  setupEventListeners()
  await checkAuth()
}

async function checkAuth() {
  // Check if user is already logged in
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    user = session.user
    isAuthenticated = true
    showMainApp()
    await loadImages()
  } else {
    showLogin()
  }
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      user = session.user
      isAuthenticated = true
      showMainApp()
      loadImages()
    } else {
      isAuthenticated = false
      user = null
      showLogin()
    }
  })
}

function showLogin() {
  loginContainer.style.display = 'flex'
  mainContainer.style.display = 'none'
  headerContainer.style.display = 'none'
}

function showMainApp() {
  loginContainer.style.display = 'none'
  mainContainer.style.display = 'block'
  headerContainer.style.display = 'block'
  
  if (isAuthenticated) {
    authBtn.textContent = 'Logout'
    uploadBanner.style.display = 'block'
    mainContainer.classList.add('with-upload-banner')
    mainContainer.classList.remove('without-upload-banner')
  } else {
    authBtn.textContent = 'Login'
    uploadBanner.style.display = 'none'
    mainContainer.classList.add('without-upload-banner')
    mainContainer.classList.remove('with-upload-banner')
  }
}

function setupEventListeners() {
  // Login form
  loginForm.addEventListener('submit', handleLogin)
  
  // Auth button (Login/Logout)
  authBtn.addEventListener('click', () => {
    if (isAuthenticated) {
      handleLogout()
    } else {
      showLogin()
    }
  })
  
  // Upload banner
  uploadBanner.addEventListener('click', () => fileInput.click())
  
  // File input
  fileInput.addEventListener('change', handleFileSelect)
  
  // Page-level drag events for overlay
  let dragCounter = 0
  
  document.body.addEventListener('dragenter', (e) => {
    e.preventDefault()
    if (isAuthenticated) {
      dragCounter++
      dragOverlay.classList.add('active')
    }
  })
  
  document.body.addEventListener('dragleave', (e) => {
    e.preventDefault()
    if (isAuthenticated) {
      dragCounter--
      if (dragCounter === 0) {
        dragOverlay.classList.remove('active')
      }
    }
  })
  
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
  
  document.body.addEventListener('drop', (e) => {
    e.preventDefault()
    dragCounter = 0
    
    if (isAuthenticated) {
      dragOverlay.classList.remove('active')
      
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      )
      
      if (files.length > 0) {
        uploadFiles(files)
      }
    }
  })
  
  // Pagination
  prevBtn.addEventListener('click', () => changeMonth(-1))
  nextBtn.addEventListener('click', () => changeMonth(1))
  
  // Overlay
  overlayClose.addEventListener('click', closeOverlay)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay()
  })
  
  // Close overlay with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeOverlay()
    }
  })
}

async function handleLogin(e) {
  e.preventDefault()
  loginError.textContent = ''
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    loginError.textContent = error.message
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length > 0) {
    uploadFiles(files)
  }
}

async function uploadFiles(files) {
  showLoading(true)
  
  for (const file of files) {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `images/${year}/${month}/${fileName}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)
      
      // Save metadata to database
      const { error: dbError } = await supabase
        .from('image_metadata')
        .insert({
          filename: fileName,
          original_name: file.name,
          storage_path: filePath,
          public_url: publicUrl,
          size: file.size,
          mime_type: file.type
        })
      
      if (dbError) throw dbError
      
      showToast(`${file.name} uploaded successfully!`, 'success')
    } catch (error) {
      console.error('Upload error:', error)
      showToast(`Failed to upload ${file.name}`, 'error')
    }
  }
  
  showLoading(false)
  fileInput.value = '' // Reset input
  await loadImages() // Reload gallery
}

async function loadImages() {
  showLoading(true)
  
  try {
    // Get all available months first
    const { data: allImages, error: monthsError } = await supabase
      .from('image_metadata')
      .select('created_at')
      .order('created_at', { ascending: false })
    
    if (monthsError) throw monthsError
    
    // Extract unique months
    availableMonths = [...new Set(
      allImages.map(img => {
        const date = new Date(img.created_at)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      })
    )].sort().reverse()
    
    // Get start and end of current month
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59)
    
    // Get images for current month
    const { data: images, error } = await supabase
      .from('image_metadata')
      .select('*')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    displayImages(images)
    updateMonthNavigation()
  } catch (error) {
    console.error('Load error:', error)
    showToast('Failed to load images', 'error')
  }
  
  showLoading(false)
}

function displayImages(images) {
  if (!images || images.length === 0) {
    gallery.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p>No images yet. Upload your first image!</p>
      </div>
    `
    return
  }
  
  gallery.innerHTML = images.map(image => `
    <div class="image-card" 
         data-url="${image.public_url}"
         data-path="${image.storage_path}"
         data-id="${image.id}">
      <img src="${image.public_url}" 
           alt="${image.original_name}"
           loading="lazy">
      ${isAuthenticated ? `<button class="delete-btn" data-id="${image.id}" data-path="${image.storage_path}" title="Delete image">×</button>` : ''}
    </div>
  `).join('')
  
  // Add click handlers
  document.querySelectorAll('.image-card').forEach(card => {
    let clickTimeout
    
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking delete button
      if (e.target.closest('.delete-btn')) return
      
      clearTimeout(clickTimeout)
      clickTimeout = setTimeout(() => {
        // Single click - copy URL
        const url = card.dataset.url
        copyToClipboard(url)
      }, 250)
    })
    
    card.addEventListener('dblclick', (e) => {
      // Don't trigger if clicking delete button
      if (e.target.closest('.delete-btn')) return
      
      clearTimeout(clickTimeout)
      // Double click - show full size
      const url = card.dataset.url
      showFullImage(url)
    })
  })
  
  // Add delete button handlers (only if authenticated)
  if (isAuthenticated) {
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        const path = btn.dataset.path
        await deleteImage(id, path)
      })
    })
  }
}

function updateMonthNavigation() {
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
  
  // Update the heading
  monthHeading.textContent = monthYear
  pageInfo.textContent = monthYear
  
  // Find current month index
  const currentIndex = availableMonths.indexOf(currentMonthStr)
  
  // Update button states
  prevBtn.disabled = currentIndex <= 0 || availableMonths.length === 0
  nextBtn.disabled = currentIndex === availableMonths.length - 1 || availableMonths.length === 0
  
  // Show/hide pagination
  pagination.style.display = availableMonths.length > 1 ? 'flex' : 'none'
}

function changeMonth(direction) {
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
  const currentIndex = availableMonths.indexOf(currentMonthStr)
  const newIndex = currentIndex + direction
  
  if (newIndex >= 0 && newIndex < availableMonths.length) {
    const [year, month] = availableMonths[newIndex].split('-')
    currentMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
    loadImages()
  }
}

function showFullImage(url) {
  overlayImage.src = url
  overlay.classList.add('active')
  document.body.style.overflow = 'hidden'
}

function closeOverlay() {
  overlay.classList.remove('active')
  overlayImage.src = ''
  document.body.style.overflow = 'auto'
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('URL copied to clipboard!', 'success')
  } catch (error) {
    console.error('Copy error:', error)
    showToast('Failed to copy URL', 'error')
  }
}

function showToast(message, type = 'success') {
  toast.textContent = message
  toast.className = `toast ${type} show`
  
  setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

async function deleteImage(id, storagePath) {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('images')
      .remove([storagePath])
    
    if (storageError) throw storageError
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('image_metadata')
      .delete()
      .eq('id', id)
    
    if (dbError) throw dbError
    
    showToast('Image deleted', 'success')
    await loadImages()
  } catch (error) {
    console.error('Delete error:', error)
    showToast('Failed to delete image', 'error')
  }
}

function showLoading(show) {
  loading.style.display = show ? 'block' : 'none'
}
