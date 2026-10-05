import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

export function DrumViewerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. Scene setup: Pure studio white
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#ffffff")

    // 2. Camera: Angled down at ~28° matching the reference photograph
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    camera.position.set(0.6, 3.6, 5.2)

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    // 4. OrbitControls for smooth 360° inspection
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 1.4, 0)
    controls.minDistance = 2.0
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI / 2 - 0.02 // Prevent going under floor

    // 5. Studio Lighting Setup matching the photo
    // Soft overall ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78)
    scene.add(ambientLight)

    // Key Light: Placed to the left-front, creating the left-side vertical highlight seen in the photo
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
    keyLight.position.set(-4.0, 7.5, 4.5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    keyLight.shadow.camera.near = 1.0
    keyLight.shadow.camera.far = 25
    keyLight.shadow.camera.left = -3
    keyLight.shadow.camera.right = 3
    keyLight.shadow.camera.top = 4
    keyLight.shadow.camera.bottom = -0.5
    keyLight.shadow.bias = -0.0001
    keyLight.shadow.radius = 2.5
    scene.add(keyLight)

    // Fill Light: Soft subtle fill on the right side
    const fillLight = new THREE.DirectionalLight(0xbad2f5, 0.7)
    fillLight.position.set(5.0, 3.0, 3.0)
    scene.add(fillLight)

    // Rim / Back Light: Top-back defining the barrel shoulder and rim against white background
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
    rimLight.position.set(0, 5.0, -4.5)
    scene.add(rimLight)

    // Soft front-low fill
    const lowLight = new THREE.DirectionalLight(0xf0f5ff, 0.4)
    lowLight.position.set(0, 0.5, 4.0)
    scene.add(lowLight)

    // 6. Seamless Ground Plane with Shadow
    const floorGeo = new THREE.PlaneGeometry(60, 60)
    const floorMat = new THREE.ShadowMaterial({
      opacity: 0.17,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    scene.add(floor)

    // Soft ambient occlusion contact shadow underneath the drum base
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 235)
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.48)")
      gradient.addColorStop(0.35, "rgba(0, 0, 0, 0.22)")
      gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.05)")
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 512, 512)
    }
    const shadowTexture = new THREE.CanvasTexture(canvas)
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    })
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat)
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.set(0.02, 0.001, 0.02)
    scene.add(contactShadow)

    // 7. Industrial Blue HDPE Plastic Materials
    const blueDrumMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#0c5fb8"), // Reference industrial HDPE cobalt blue
      roughness: 0.36,                   // Blow-molded plastic sheen
      metalness: 0.02,
      clearcoat: 0.25,                   // Subtle surface gloss
      clearcoatRoughness: 0.35,
      reflectivity: 0.5,
    })

    const bungMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#08458f"), // Deeper blue for bung neck & cap
      roughness: 0.30,
      metalness: 0.04,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
    })

    const drumGroup = new THREE.Group()

    // --- Drum Body Profile (LatheGeometry) ---
    // Modeled faithfully to standard 200L / 55-gal tight-head industrial drum
    const profilePoints: THREE.Vector2[] = [
      // 1. Base push-up bottom recess (center)
      new THREE.Vector2(0.0, 0.035),
      new THREE.Vector2(0.42, 0.035),
      new THREE.Vector2(0.62, 0.02),

      // 2. Base contact ring on the floor (y = 0)
      new THREE.Vector2(0.70, 0.005),
      new THREE.Vector2(0.73, 0.001),
      new THREE.Vector2(0.75, 0.006),

      // 3. Rounded bottom heel / corner
      new THREE.Vector2(0.78, 0.035),
      new THREE.Vector2(0.80, 0.08),
      new THREE.Vector2(0.81, 0.16),
      new THREE.Vector2(0.815, 0.28),

      // 4. Lower body wall
      new THREE.Vector2(0.818, 0.55),
      new THREE.Vector2(0.825, 0.85),

      // 5. Lower subtle molded rib / hoop ring
      new THREE.Vector2(0.832, 0.95),
      new THREE.Vector2(0.835, 1.00),
      new THREE.Vector2(0.832, 1.05),

      // 6. Mid-body gentle bulge
      new THREE.Vector2(0.835, 1.40),
      new THREE.Vector2(0.836, 1.60),

      // 7. Upper subtle molded rib / hoop ring
      new THREE.Vector2(0.832, 1.95),
      new THREE.Vector2(0.835, 2.00),
      new THREE.Vector2(0.832, 2.05),

      // 8. Upper body and shoulder transition
      new THREE.Vector2(0.825, 2.30),
      new THREE.Vector2(0.815, 2.45),
      new THREE.Vector2(0.805, 2.54),

      // 9. Molded undercut groove right below top chime
      new THREE.Vector2(0.792, 2.58),
      new THREE.Vector2(0.794, 2.60),

      // 10. Top chime (rim): stepped profile matching photo
      new THREE.Vector2(0.822, 2.63),
      new THREE.Vector2(0.828, 2.68),
      new THREE.Vector2(0.822, 2.70), // subtle groove in rim
      new THREE.Vector2(0.826, 2.74),
      new THREE.Vector2(0.824, 2.78),
      new THREE.Vector2(0.810, 2.805), // top outer rounded crown
      new THREE.Vector2(0.780, 2.81),  // top chime apex
      new THREE.Vector2(0.755, 2.79),

      // 11. Inner chime wall dropping down to recessed lid
      new THREE.Vector2(0.735, 2.73),
      new THREE.Vector2(0.722, 2.67),
      new THREE.Vector2(0.710, 2.64),  // inner corner

      // 12. Recessed top lid surface
      new THREE.Vector2(0.66, 2.635),
      new THREE.Vector2(0.40, 2.638),
      new THREE.Vector2(0.0, 2.64),
    ]

    const latheGeo = new THREE.LatheGeometry(profilePoints, 128)
    latheGeo.computeVertexNormals()
    const drumBody = new THREE.Mesh(latheGeo, blueDrumMaterial)
    drumBody.castShadow = true
    drumBody.receiveShadow = true
    drumGroup.add(drumBody)

    // --- Molded Top Head Lid Details ---
    // 1. Molded Center Handle Channel / Stiffening Bridge across the lid
    const bridgeShape = new THREE.Shape()
    bridgeShape.moveTo(-0.16, -0.66)
    bridgeShape.lineTo(0.16, -0.66)
    bridgeShape.lineTo(0.16, 0.66)
    bridgeShape.lineTo(-0.16, 0.66)
    bridgeShape.closePath()

    const bridgeGeo = new THREE.ExtrudeGeometry(bridgeShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.012,
    })
    bridgeGeo.rotateX(Math.PI / 2)
    const bridgeMesh = new THREE.Mesh(bridgeGeo, blueDrumMaterial)
    bridgeMesh.position.set(0, 2.655, 0)
    bridgeMesh.receiveShadow = true
    drumGroup.add(bridgeMesh)

    // 2. Prominent Bung Opening & Threaded Cap (Tapón de 2" en el lado derecho-frontal)
    const bungX = 0.28
    const bungZ = 0.32
    const bungY = 2.64

    const bungGroup = new THREE.Group()
    bungGroup.position.set(bungX, bungY, bungZ)

    // Recessed pocket around the bung
    const pocketGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.012, 32)
    const pocketMesh = new THREE.Mesh(pocketGeo, blueDrumMaterial)
    pocketMesh.position.y = 0.005
    bungGroup.add(pocketMesh)

    // Raised outer threaded neck collar
    const collarGeo = new THREE.CylinderGeometry(0.105, 0.11, 0.08, 48)
    const collarMesh = new THREE.Mesh(collarGeo, bungMaterial)
    collarMesh.position.y = 0.045
    collarMesh.castShadow = true
    collarMesh.receiveShadow = true
    bungGroup.add(collarMesh)

    // Outer thread ridges
    const thread1Geo = new THREE.TorusGeometry(0.108, 0.01, 16, 48)
    thread1Geo.rotateX(Math.PI / 2)
    const thread1 = new THREE.Mesh(thread1Geo, bungMaterial)
    thread1.position.y = 0.065
    bungGroup.add(thread1)

    const thread2Geo = new THREE.TorusGeometry(0.109, 0.009, 16, 48)
    thread2Geo.rotateX(Math.PI / 2)
    const thread2 = new THREE.Mesh(thread2Geo, bungMaterial)
    thread2.position.y = 0.038
    bungGroup.add(thread2)

    // Bung collar top curled lip
    const bungLipGeo = new THREE.TorusGeometry(0.095, 0.012, 16, 48)
    bungLipGeo.rotateX(Math.PI / 2)
    const bungLip = new THREE.Mesh(bungLipGeo, bungMaterial)
    bungLip.position.y = 0.082
    bungGroup.add(bungLip)

    // Interior recessed opening with dark depth
    const innerHoleGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.06, 32)
    const innerHoleMat = new THREE.MeshStandardMaterial({
      color: 0x052147,
      roughness: 0.6,
      metalness: 0.1,
    })
    const innerHole = new THREE.Mesh(innerHoleGeo, innerHoleMat)
    innerHole.position.y = 0.055
    bungGroup.add(innerHole)

    // Internal drive cross socket in the plug
    const socketGeo = new THREE.BoxGeometry(0.10, 0.012, 0.016)
    const socket = new THREE.Mesh(socketGeo, bungMaterial)
    socket.position.y = 0.06
    bungGroup.add(socket)

    drumGroup.add(bungGroup)

    // 3. Secondary 3/4" Vent Bung on Opposite Side (Back-Left)
    const ventGroup = new THREE.Group()
    ventGroup.position.set(-0.28, bungY, -0.32)

    const ventCollarGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.045, 32)
    const ventCollar = new THREE.Mesh(ventCollarGeo, bungMaterial)
    ventCollar.position.y = 0.022
    ventCollar.castShadow = true
    ventGroup.add(ventCollar)

    const ventLipGeo = new THREE.TorusGeometry(0.075, 0.008, 16, 32)
    ventLipGeo.rotateX(Math.PI / 2)
    const ventLip = new THREE.Mesh(ventLipGeo, bungMaterial)
    ventLip.position.y = 0.044
    ventGroup.add(ventLip)

    const ventInnerGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.035, 24)
    const ventInner = new THREE.Mesh(ventInnerGeo, innerHoleMat)
    ventInner.position.y = 0.03
    ventGroup.add(ventInner)

    drumGroup.add(ventGroup)

    // Set initial orientation matching photo
    drumGroup.rotation.y = 0.15
    scene.add(drumGroup)

    // 8. Render animation loop
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 9. Resize listener
    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        cursor: "grab",
      }}
    />
  )
}
