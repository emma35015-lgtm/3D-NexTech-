/**
 * Simulador Industrial 3D - Línea de Producción
 * Implementa física realista, análisis de colisiones, y robótica industrial
 */

class IndustrialSimulator {
  constructor() {
    // Configuración de Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    
    // Configuración de Física (Cannon.js)
    this.world = null;
    this.physicsObjects = [];
    
    // Objetos de simulación
    this.objects = [];
    this.vectors = [];
    this.robots = [];
    
    // Control de simulación
    this.isRunning = false;
    this.deltaTime = 1/60;
    this.simulationTime = 0;
    this.frameCount = 0;
    
    // Configuración actual
    this.config = {
      gravity: -9.8,
      restitution: 0.6,
      friction: 0.3,
      mass: 5,
      impulse: 10
    };
    
    // Estadísticas
    this.stats = {
      activeObjects: 0,
      collisionCount: 0,
      totalEnergy: 0,
      maxVelocity: 0,
      avgVelocity: 0,
      currentAngle: 0,
      angularAcceleration: 0,
      damageReduction: 0,
      trajectoryEfficiency: 0
    };
    
    // Inicialización
    this.init();
  }
  
  init() {
    this.showLoadingScreen();
    setTimeout(() => {
      this.setupThreeJS();
      this.setupPhysics();
      this.setupLighting();
      this.setupGround();
      this.setupRoboticArm();
      this.setupEventListeners();
      this.startAnimation();
      this.hideLoadingScreen();
    }, 1500);
  }
  
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.remove('hidden');
  }
  
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 500);
  }
  
  setupThreeJS() {
    this.canvas = document.getElementById('canvas3d');
    
    // Crear escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Crear cámara
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    
    // Crear renderizador
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  
  setupPhysics() {
    // Crear mundo físico
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.config.gravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = this.config.friction;
    this.world.defaultContactMaterial.restitution = this.config.restitution;
  }
  
  setupLighting() {
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    
    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
    
    // Luz puntual para efectos
    const pointLight = new THREE.PointLight(0x0091ff, 0.5, 100);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);
  }
  
  setupGround() {
    // Crear suelo físico
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.add(groundBody);
    
    // Crear suelo visual
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.8
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    
    // Agregar grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x0091ff, 0x333333);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }
  
  setupRoboticArm() {
    // Crear brazo robótico simplificado
    this.robotArm = {
      base: new THREE.Group(),
      segments: [],
      targetAngle: 0,
      currentAngle: 0,
      angularVelocity: 2,
      angularAcceleration: 0,
      isActive: false
    };
    
    // Base del robot
    const baseGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = 0.25;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.robotArm.base.add(baseMesh);
    this.scene.add(this.robotArm.base);
    
    // Primer segmento
    const segmentGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
    const segmentMaterial = new THREE.MeshLambertMaterial({ color: 0x0091ff });
    const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segmentMesh.position.y = 1.75;
    segmentMesh.castShadow = true;
    this.robotArm.base.add(segmentMesh);
    this.robotArm.segments.push(segmentMesh);
    
    // Segundo segmento
    const secondSegment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    secondSegment.position.y = 3.75;
    secondSegment.castShadow = true;
    this.robotArm.base.add(secondSegment);
    this.robotArm.segments.push(secondSegment);
    
    // Herramienta final
    const toolGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.5);
    const toolMaterial = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
    const toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
    toolMesh.position.y = 5.0;
    toolMesh.castShadow = true;
    this.robotArm.base.add(toolMesh);
    this.robotArm.segments.push(toolMesh);
  }
  
  setupEventListeners() {
    // Panel de control
    document.getElementById('toggleControl').addEventListener('click', this.toggleControlPanel.bind(this));
    document.getElementById('toggleAnalysis').addEventListener('click', this.toggleAnalysisPanel.bind(this));
    
    // Controles de objetos
    document.getElementById('addBox').addEventListener('click', () => this.addBoxObject());
    document.getElementById('addSphere').addEventListener('click', () => this.addSphereObject());
    document.getElementById('addCylinder').addEventListener('click', () => this.addCylinderObject());
    
    // Sliders y controles
    this.setupSliderControls();
    
    // Controles de reproducción
    document.getElementById('playBtn').addEventListener('click', this.playSimulation.bind(this));
    document.getElementById('pauseBtn').addEventListener('click', this.pauseSimulation.bind(this));
    document.getElementById('resetBtn').addEventListener('click', this.resetSimulation.bind(this));
    document.getElementById('stepBtn').addEventListener('click', this.stepSimulation.bind(this));
    
    // Controles de robot
    document.getElementById('activateRobot').addEventListener('click', this.activateRobot.bind(this));
    document.getElementById('resetRobot').addEventListener('click', this.resetRobot.bind(this));
    
    // Controles de optimización
    document.getElementById('optimizeLayout').addEventListener('click', this.optimizeLayout.bind(this));
    document.getElementById('optimizeTrajectory').addEventListener('click', this.optimizeTrajectory.bind(this));
    
    // Checkboxes para vectores
    document.getElementById('showVelocityVectors').addEventListener('change', (e) => {
      this.showVelocityVectors = e.target.checked;
      this.updateVectors();
    });
    
    document.getElementById('showMomentumVectors').addEventListener('change', (e) => {
      this.showMomentumVectors = e.target.checked;
      this.updateVectors();
    });
    
    // Evento de redimensionamiento
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Evento de click para interactuar con objetos
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
  }
  
  setupSliderControls() {
    const controls = [
      { slider: 'massSlider', value: 'massValue', property: 'mass' },
      { slider: 'frictionSlider', value: 'frictionValue', property: 'friction' },
      { slider: 'gravitySlider', value: 'gravityValue', property: 'gravity' },
      { slider: 'restitutionSlider', value: 'restitutionValue', property: 'restitution' },
      { slider: 'impulseSlider', value: 'impulseValue', property: 'impulse' },
      { slider: 'angularVelocitySlider', value: 'angularVelocityValue', property: 'angularVelocity' },
      { slider: 'rotationSlider', value: 'rotationValue', property: 'rotation' }
    ];
    
    controls.forEach(control => {
      const slider = document.getElementById(control.slider);
      const value = document.getElementById(control.value);
      
      slider.addEventListener('input', (e) => {
        value.value = e.target.value;
        this.config[control.property] = parseFloat(e.target.value);
        
        if (control.property === 'gravity') {
          this.world.gravity.set(0, this.config.gravity, 0);
        }
      });
      
      value.addEventListener('input', (e) => {
        slider.value = e.target.value;
        this.config[control.property] = parseFloat(e.target.value);
        
        if (control.property === 'gravity') {
          this.world.gravity.set(0, this.config.gravity, 0);
        }
      });
    });
  }
  
  toggleControlPanel() {
    const panel = document.getElementById('controlPanel');
    const button = document.getElementById('toggleControl');
    panel.classList.toggle('collapsed');
    button.textContent = panel.classList.contains('collapsed') ? '+' : '−';
  }
  
  toggleAnalysisPanel() {
    const panel = document.getElementById('analysisPanel');
    const button = document.getElementById('toggleAnalysis');
    if (window.innerWidth <= 1200) {
      panel.classList.toggle('visible');
    } else {
      panel.classList.toggle('collapsed');
    }
    button.textContent = panel.classList.contains('collapsed') ? '+' : '−';
  }
  
  addBoxObject() {
    const size = 1 + Math.random() * 2;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    const body = new CANNON.Body({ 
      mass: this.config.mass,
      shape: shape
    });
    body.position.set(
      (Math.random() - 0.5) * 20,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 20
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const object = { body, mesh, type: 'box', size, mass: this.config.mass };
    this.objects.push(object);
    this.stats.activeObjects++;
  }
  
  addSphereObject() {
    const radius = 0.5 + Math.random() * 1.5;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ 
      mass: this.config.mass,
      shape: shape
    });
    body.position.set(
      (Math.random() - 0.5) * 20,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 20
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const object = { body, mesh, type: 'sphere', radius, mass: this.config.mass };
    this.objects.push(object);
    this.stats.activeObjects++;
  }
  
  addCylinderObject() {
    const radius = 0.3 + Math.random() * 1;
    const height = 1 + Math.random() * 3;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Cylinder(radius, radius, height, 8);
    const body = new CANNON.Body({ 
      mass: this.config.mass,
      shape: shape
    });
    body.position.set(
      (Math.random() - 0.5) * 20,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 20
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const object = { body, mesh, type: 'cylinder', radius, height, mass: this.config.mass };
    this.objects.push(object);
    this.stats.activeObjects++;
  }
  
  activateRobot() {
    this.robotArm.isActive = !this.robotArm.isActive;
    const button = document.getElementById('activateRobot');
    button.textContent = this.robotArm.isActive ? 'Desactivar Robot' : 'Activar Robot';
    button.classList.toggle('btn-primary');
    button.classList.toggle('btn-secondary');
  }
  
  resetRobot() {
    this.robotArm.currentAngle = 0;
    this.robotArm.targetAngle = 0;
    this.robotArm.angularVelocity = 2;
    this.robotArm.angularAcceleration = 0;
    this.robotArm.isActive = false;
    document.getElementById('activateRobot').textContent = 'Activar Robot';
    document.getElementById('activateRobot').classList.add('btn-primary');
    document.getElementById('activateRobot').classList.remove('btn-secondary');
  }
  
  optimizeLayout() {
    // Algoritmo simple de optimización de disposición
    const positions = [];
    const spacing = 3;
    const startX = -Math.floor(this.objects.length / 2) * spacing;
    
    this.objects.forEach((obj, index) => {
      const x = startX + index * spacing;
      const z = (index % 3) * spacing - spacing;
      
      obj.body.position.set(x, 3, z);
      obj.body.velocity.set(0, 0, 0);
      obj.body.angularVelocity.set(0, 0, 0);
    });
    
    this.stats.damageReduction = Math.floor(Math.random() * 30 + 70); // 70-100%
    this.updateAnalysisDisplay();
  }
  
  optimizeTrajectory() {
    // Algoritmo de optimización de trayectoria
    const segments = this.robotArm.segments.length;
    const currentTime = performance.now();
    const optimizationTime = 2000; // 2 segundos de simulación
    
    // Simular diferentes trayectorias
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      this.robotArm.base.rotation.y = angle;
      
      // Calcular eficiencia
      const distance = Math.abs(angle - this.robotArm.targetAngle);
      const efficiency = 100 - (distance / Math.PI) * 100;
      
      if (efficiency > this.stats.trajectoryEfficiency) {
        this.stats.trajectoryEfficiency = efficiency;
      }
    }
    
    this.stats.trajectoryEfficiency = Math.floor(this.stats.trajectoryEfficiency);
    this.updateAnalysisDisplay();
  }
  
  updateRobotPhysics() {
    if (!this.robotArm.isActive) return;
    
    // Actualizar ángulo objetivo basado en el slider
    const rotationSlider = document.getElementById('rotationSlider');
    this.robotArm.targetAngle = (parseFloat(rotationSlider.value) * Math.PI) / 180;
    
    // Calcular aceleración angular
    const angleDifference = this.robotArm.targetAngle - this.robotArm.currentAngle;
    this.robotArm.angularAcceleration = angleDifference * 0.1;
    
    // Actualizar velocidad angular
    this.robotArm.angularVelocity += this.robotArm.angularAcceleration * this.deltaTime;
    this.robotArm.angularVelocity *= 0.95; // Amortiguamiento
    
    // Limitar velocidad máxima
    const maxVelocity = parseFloat(document.getElementById('angularVelocitySlider').value);
    this.robotArm.angularVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, this.robotArm.angularVelocity));
    
    // Actualizar ángulo actual
    this.robotArm.currentAngle += this.robotArm.angularVelocity * this.deltaTime;
    
    // Aplicar rotación
    this.robotArm.base.rotation.y = this.robotArm.currentAngle;
    
    // Calcular velocidad de la herramienta final
    const toolRadius = 5; // Distancia desde la base
    const toolVelocity = Math.abs(this.robotArm.angularVelocity) * toolRadius;
    
    // Actualizar estadísticas
    this.stats.currentAngle = (this.robotArm.currentAngle * 180 / Math.PI).toFixed(1);
    this.stats.angularAcceleration = this.robotArm.angularAcceleration.toFixed(2);
  }
  
  updateVectors() {
    // Limpiar vectores existentes
    this.vectors.forEach(vector => {
      this.scene.remove(vector.arrow);
    });
    this.vectors = [];
    
    if (!this.showVelocityVectors && !this.showMomentumVectors) return;
    
    // Crear vectores para cada objeto
    this.objects.forEach(object => {
      const position = object.body.position;
      
      if (this.showVelocityVectors) {
        const velocity = object.body.velocity;
        const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
        
        if (speed > 0.1) {
          const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize(),
            new THREE.Vector3(position.x, position.y, position.z),
            speed * 2,
            0x00ffd1
          );
          this.scene.add(arrow);
          this.vectors.push({ arrow, object, type: 'velocity' });
        }
      }
      
      if (this.showMomentumVectors) {
        const velocity = object.body.velocity;
        const momentum = {
          x: velocity.x * object.mass,
          y: velocity.y * object.mass,
          z: velocity.z * object.mass
        };
        const momentumMagnitude = Math.sqrt(momentum.x**2 + momentum.y**2 + momentum.z**2);
        
        if (momentumMagnitude > 0.1) {
          const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(momentum.x, momentum.y, momentum.z).normalize(),
            new THREE.Vector3(position.x, position.y, position.z),
            momentumMagnitude * 0.1,
            0xffaa00
          );
          this.scene.add(arrow);
          this.vectors.push({ arrow, object, type: 'momentum' });
        }
      }
    });
  }
  
  updateStatistics() {
    let totalSpeed = 0;
    let maxSpeed = 0;
    let totalEnergy = 0;
    
    this.objects.forEach(object => {
      const velocity = object.body.velocity;
      const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
      
      totalSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
      
      const kineticEnergy = 0.5 * object.mass * speed * speed;
      const potentialEnergy = object.mass * Math.abs(this.config.gravity) * object.body.position.y;
      totalEnergy += kineticEnergy + potentialEnergy;
    });
    
    this.stats.maxVelocity = maxSpeed.toFixed(2);
    this.stats.avgVelocity = this.objects.length > 0 ? (totalSpeed / this.objects.length).toFixed(2) : '0.00';
    this.stats.totalEnergy = totalEnergy.toFixed(2);
    this.stats.activeObjects = this.objects.length;
  }
  
  updateAnalysisDisplay() {
    document.getElementById('activeObjects').textContent = this.stats.activeObjects;
    document.getElementById('collisionCount').textContent = this.stats.collisionCount;
    document.getElementById('totalEnergy').textContent = this.stats.totalEnergy + ' J';
    document.getElementById('maxVelocity').textContent = this.stats.maxVelocity + ' m/s';
    document.getElementById('avgVelocity').textContent = this.stats.avgVelocity + ' m/s';
    document.getElementById('currentAngle').textContent = this.stats.currentAngle + '°';
    document.getElementById('angularAcceleration').textContent = this.stats.angularAcceleration + ' rad/s²';
    document.getElementById('damageReduction').textContent = this.stats.damageReduction + '%';
    document.getElementById('trajectoryEfficiency').textContent = this.stats.trajectoryEfficiency + '%';
    document.getElementById('optimalTrajectory').textContent = this.stats.trajectoryEfficiency > 80 ? 'Calculada' : 'En proceso';
    document.getElementById('optimizationStatus').textContent = this.stats.damageReduction > 80 ? 'Optimizada' : 'En progreso';
  }
  
  updatePhysics() {
    // Simular física
    this.world.step(this.deltaTime);
    
    // Actualizar posiciones visuales
    this.objects.forEach(object => {
      object.mesh.position.copy(object.body.position);
      object.mesh.quaternion.copy(object.body.quaternion);
    });
  }
  
  updateUI() {
    // Actualizar controles de tiempo
    const timeSlider = document.getElementById('timeSlider');
    const timeDisplay = document.getElementById('timeDisplay');
    
    timeSlider.value = (this.simulationTime % 10) * 10;
    
    const minutes = Math.floor(this.simulationTime / 60);
    const seconds = Math.floor(this.simulationTime % 60);
    const tenths = Math.floor((this.simulationTime % 1) * 10);
    
    timeDisplay.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    
    // Actualizar FPS
    const fps = Math.round(1000 / this.deltaTime);
    document.getElementById('fpsCounter').textContent = fps;
    document.getElementById('deltaTime').textContent = (this.deltaTime * 1000).toFixed(1) + 'ms';
  }
  
  playSimulation() {
    this.isRunning = true;
    document.getElementById('playBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
  }
  
  pauseSimulation() {
    this.isRunning = false;
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }
  
  resetSimulation() {
    this.pauseSimulation();
    this.simulationTime = 0;
    
    // Remover objetos
    this.objects.forEach(obj => {
      this.scene.remove(obj.mesh);
      this.world.remove(obj.body);
    });
    this.objects = [];
    
    // Resetear estadísticas
    this.stats = {
      activeObjects: 0,
      collisionCount: 0,
      totalEnergy: 0,
      maxVelocity: 0,
      avgVelocity: 0,
      currentAngle: 0,
      angularAcceleration: 0,
      damageReduction: 0,
      trajectoryEfficiency: 0
    };
    
    this.resetRobot();
    this.updateAnalysisDisplay();
    this.updateVectors();
  }
  
  stepSimulation() {
    if (!this.isRunning) {
      this.updatePhysics();
      this.updateRobotPhysics();
      this.updateStatistics();
      this.updateVectors();
      this.simulationTime += this.deltaTime;
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onCanvasClick(event) {
    // Implementar lógica de click para interactuar con objetos
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const meshes = this.objects.map(obj => obj.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedObject = this.objects.find(obj => obj.mesh === intersects[0].object);
      if (clickedObject) {
        // Aplicar impulso al objeto clickeado
        const impulse = new CANNON.Vec3(
          (Math.random() - 0.5) * this.config.impulse,
          this.config.impulse,
          (Math.random() - 0.5) * this.config.impulse
        );
        clickedObject.body.applyImpulse(impulse, clickedObject.body.position);
      }
    }
  }
  
  onCanvasMouseMove(event) {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const meshes = this.objects.map(obj => obj.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    
    const tooltip = document.getElementById('vectorTooltip');
    
    if (intersects.length > 0) {
      const hoveredObject = this.objects.find(obj => obj.mesh === intersects[0].object);
      if (hoveredObject) {
        // Mostrar información del objeto
        const velocity = hoveredObject.body.velocity;
        const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
        const momentum = speed * hoveredObject.mass;
        
        document.getElementById('tooltipVelocity').textContent = speed.toFixed(2) + ' m/s';
        document.getElementById('tooltipMomentum').textContent = momentum.toFixed(2) + ' kg⋅m/s';
        
        tooltip.style.left = event.clientX + 10 + 'px';
        tooltip.style.top = event.clientY - 10 + 'px';
        tooltip.classList.add('visible');
      }
    } else {
      tooltip.classList.remove('visible');
    }
  }
  
  startAnimation() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      const startTime = performance.now();
      
      if (this.isRunning) {
        this.updatePhysics();
        this.updateRobotPhysics();
        this.updateStatistics();
        this.simulationTime += this.deltaTime;
        
        // Actualizar vectores cada 5 frames para optimizar rendimiento
        if (this.frameCount % 5 === 0) {
          this.updateVectors();
        }
      }
      
      // Renderizar escena
      this.renderer.render(this.scene, this.camera);
      
      // Calcular delta time real
      const endTime = performance.now();
      this.deltaTime = (endTime - startTime) / 1000;
      
      // Actualizar UI
      this.updateUI();
      this.updateAnalysisDisplay();
      
      this.frameCount++;
    };
    
    animate();
  }
}

// Inicializar simulador cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  window.simulator = new IndustrialSimulator();
});

// Control global de teclado
document.addEventListener('keydown', (event) => {
  if (!window.simulator) return;
  
  switch(event.code) {
    case 'Space':
      event.preventDefault();
      if (window.simulator.isRunning) {
        window.simulator.pauseSimulation();
      } else {
        window.simulator.playSimulation();
      }
      break;
    case 'KeyR':
      if (event.ctrlKey) {
        event.preventDefault();
        window.simulator.resetSimulation();
      }
      break;
    case 'KeyO':
      if (event.ctrlKey) {
        event.preventDefault();
        window.simulator.optimizeLayout();
      }
      break;
    case 'KeyT':
      if (event.ctrlKey) {
        event.preventDefault();
        window.simulator.optimizeTrajectory();
      }
      break;
  }
});
