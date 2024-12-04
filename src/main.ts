import './style.css'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let sphereBg: THREE.Mesh
let nucleus: THREE.Mesh
let stars: THREE.Points
let controls: OrbitControls
let container: HTMLElement | null = document.getElementById('canvas')
let timeoutDebounce: NodeJS.Timeout
const noise = createNoise3D()
const blobScale = 3

init()
animate()

function init(): void {
  if (!container) {
    console.error('Container element not found')
    return
  }

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  )
  camera.position.set(0, 0, 500)

  // Lights
  const directionalLight = new THREE.DirectionalLight('#fff', 2)
  directionalLight.position.set(0, 50, -20)
  scene.add(directionalLight)

  const ambientLight = new THREE.AmbientLight('#ffffff', 1)
  ambientLight.position.set(0, 20, 20)
  scene.add(ambientLight)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.appendChild(renderer.domElement)

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5
  controls.target = new THREE.Vector3(0, 0, 0)
  controls.maxDistance = 350
  controls.minDistance = 300
  controls.enablePan = true

  // Texture Loader
  const loader = new THREE.TextureLoader()
  const textureSphereBg = loader.load('/assets/galaxy.jpg')
  const textureNucleus = loader.load('/assets/nuclues.jpg')
  const textureStar = loader.load('/assets/star.png')
  const texture1 = loader.load('/assets/t1.png')
  const texture2 = loader.load('/assets/t2.png')
  const texture4 = loader.load('/assets/t3.png')

  // Nucleus
  textureNucleus.anisotropy = 16
  const icosahedronGeometry = new THREE.IcosahedronGeometry(30, 10)
  const lambertMaterial = new THREE.MeshPhongMaterial({ map: textureNucleus })
  nucleus = new THREE.Mesh(icosahedronGeometry, lambertMaterial)
  scene.add(nucleus)

  // Sphere Background
  textureSphereBg.anisotropy = 16
  const geometrySphereBg = new THREE.SphereGeometry(150, 40, 40)
  const materialSphereBg = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    map: textureSphereBg,
  })
  sphereBg = new THREE.Mesh(geometrySphereBg, materialSphereBg)
  scene.add(sphereBg)

  // Moving Stars
  const starsGeometry = new THREE.BufferGeometry()
  const starPositions: Float32Array = new Float32Array(50 * 3)

  for (let i = 0; i < 50; i++) {
    const particleStar = randomPointSphere(150)
    starPositions.set([particleStar.x, particleStar.y, particleStar.z], i * 3)
  }
  starsGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(starPositions, 3)
  )

  const starsMaterial = new THREE.PointsMaterial({
    size: 5,
    color: '#ffffff',
    transparent: true,
    opacity: 0.8,
    map: textureStar,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  stars = new THREE.Points(starsGeometry, starsMaterial)
  scene.add(stars)

  // Fixed Stars
  scene.add(createStars(texture1, 15, 20))
  scene.add(createStars(texture2, 5, 5))
  scene.add(createStars(texture4, 7, 5))

  // Event Listeners
  window.addEventListener('resize', () => {
    clearTimeout(timeoutDebounce)
    timeoutDebounce = setTimeout(onWindowResize, 80)
  })
}

function randomPointSphere(radius: number): THREE.Vector3 {
  const theta = 2 * Math.PI * Math.random()
  const phi = Math.acos(2 * Math.random() - 1)
  const dx = radius * Math.sin(phi) * Math.cos(theta)
  const dy = radius * Math.sin(phi) * Math.sin(theta)
  const dz = radius * Math.cos(phi)
  return new THREE.Vector3(dx, dy, dz)
}

function createStars(
  texture: THREE.Texture,
  size: number,
  total: number
): THREE.Points {
  const pointGeometry = new THREE.BufferGeometry()
  const positions: Float32Array = new Float32Array(total * 3)

  for (let i = 0; i < total; i++) {
    const radius = THREE.MathUtils.randInt(70, 149)
    const particles = randomPointSphere(radius)
    positions.set([particles.x, particles.y, particles.z], i * 3)
  }

  pointGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  )

  const pointMaterial = new THREE.PointsMaterial({
    size: size,
    map: texture,
    blending: THREE.AdditiveBlending,
  })

  return new THREE.Points(pointGeometry, pointMaterial)
}

function animate(): void {
  // Stars Animation
  const positions = stars.geometry.attributes.position.array as Float32Array
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += (0 - positions[i]) / 50 // x
    positions[i + 1] += (0 - positions[i + 1]) / 50 // y
    positions[i + 2] += (0 - positions[i + 2]) / 50 // z
  }
  stars.geometry.attributes.position.needsUpdate = true

  // Nucleus Animation
  const time = Date.now()
  const vertices = (nucleus.geometry as THREE.IcosahedronGeometry).attributes
    .position.array as Float32Array

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]
    const y = vertices[i + 1]
    const z = vertices[i + 2]

    const offset =
      noise(x + time * 0.0005, y + time * 0.0003, z + time * 0.0008) * blobScale
    vertices[i] = x * (1 + offset) // x
    vertices[i + 1] = y * (1 + offset) // y
    vertices[i + 2] = z * (1 + offset) // z
  }

  nucleus.geometry.attributes.position.needsUpdate = true

  // Sphere Background Animation
  sphereBg.rotation.x += 0.002
  sphereBg.rotation.y += 0.002
  sphereBg.rotation.z += 0.002

  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

function onWindowResize(): void {
  if (!container) return
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}
