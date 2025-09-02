document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const experimentArea = document.getElementById('experimentArea');
    const blockContainer = document.getElementById('blockContainer');
    const block = document.getElementById('block');
    const weightsContainer = document.getElementById('weightsContainer');
    const string = document.getElementById('string');
    const newtonMeter = document.getElementById('newtonMeter');
    const meterReading = document.getElementById('meterReading');
    const meterTicks = document.getElementById('meterTicks');
    const surface = document.getElementById('surface');
    const addWeightBtn = document.getElementById('addWeight');
    const removeWeightBtn = document.getElementById('removeWeight');
    const resetBtn = document.getElementById('resetBtn');
    const recordDataBtn = document.getElementById('recordData');
    const dataTable = document.getElementById('dataTable');
    const totalMassDisplay = document.getElementById('totalMass');
    const forceDisplay = document.getElementById('forceDisplay');
    const kineticForceDisplay = document.getElementById('kineticForceDisplay');
    const frictionDisplay = document.getElementById('frictionDisplay');
    const surfaceOptions = document.querySelectorAll('.surface-option');
    const toast = document.getElementById('toast');
    
    // Variables
    let isDragging = false;
    let isMoving = false;
    let startX, currentX;
    let blockMass = 1.0; // kg
    let currentForce = 0; // N
    let kineticFrictionForce = 0; // N (kinetic friction force)
    let stableKineticForce = 0; // N (stable kinetic friction force for recording)
    let staticFrictionForce = 0; // N (static friction force)
    let currentFriction = 0.3; // Default friction coefficient (wood)
    let staticFrictionRatio = 1.2; // Static friction is higher than kinetic friction
    let currentSurface = 'wood'; // Default surface
    let gravity = 9.8; // m/s²
    let maxPull = 30; // Maximum force in Newtons
    let blockInitialX = 500;
    let meterInitialX = 300;
    let wobbleInterval;
    let hasMovedBlock = false; // Track if block has moved
    let justStartedMoving = false; // Track the moment when block starts moving
    
    // Initialize
    createMeterTicks();
    updateBlockPosition(blockInitialX);
    updateMeterPosition(meterInitialX);
    updateSurface('wood');
    updateString();
    updateMeterReading(0);
    
    // Event listeners
    newtonMeter.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch support
    newtonMeter.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    addWeightBtn.addEventListener('click', addWeight);
    removeWeightBtn.addEventListener('click', removeWeight);
    resetBtn.addEventListener('click', resetExperiment);
    recordDataBtn.addEventListener('click', recordDataPoint);
    
    surfaceOptions.forEach(option => {
        option.addEventListener('click', function() {
            const surfaceType = this.getAttribute('data-surface');
            const frictionValue = parseFloat(this.getAttribute('data-friction'));
            const staticRatio = parseFloat(this.getAttribute('data-static-ratio'));
            updateSurface(surfaceType, frictionValue, staticRatio);
            
            // Update active state
            surfaceOptions.forEach(opt => opt.classList.remove('border-blue-500'));
            this.classList.add('border-blue-500');
        });
    });
    
    // Set initial active surface
    document.querySelector('[data-surface="wood"]').classList.add('border-blue-500');
    
    // Functions
    function createMeterTicks() {
        // Create tick marks for the meter scale
        for (let i = 0; i <= 30; i++) {
            const tick = document.createElement('div');
            tick.className = i % 10 === 0 ? 'meter-tick major' : 'meter-tick';
            
            // Position the tick
            const position = (i / 30) * 160 + 10; // 160px is the usable width, 10px is the left padding
            tick.style.left = position + 'px';
            
            meterTicks.appendChild(tick);
        }
    }
    
    function startDrag(e) {
        isDragging = true;
        newtonMeter.classList.add('dragging');
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        currentX = parseInt(newtonMeter.style.left) || meterInitialX;
        
        // Stop wobble if it's running
        if (wobbleInterval) {
            clearInterval(wobbleInterval);
            wobbleInterval = null;
        }
        
        // Reset movement state
        isMoving = false;
        justStartedMoving = false;
        
        e.preventDefault();
    }
    
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            startDrag(e);
        }
    }
    
    // Add randomness to a value within a percentage range
    function addRandomness(value, percentRange) {
        const randomFactor = 1 + (Math.random() * percentRange * 2 - percentRange);
        return value * randomFactor;
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (!clientX) return;
        
        const deltaX = clientX - startX;
        let newMeterX = Math.max(100, Math.min(meterInitialX, currentX + deltaX));
        
        // Calculate pull distance
        const pullDistance = meterInitialX - newMeterX;
        
        // Calculate base friction forces with slight randomness
        const baseKineticFrictionForce = blockMass * gravity * currentFriction;
        const baseStaticFrictionForce = baseKineticFrictionForce * staticFrictionRatio;
        
        // Add small randomness to the friction forces (±3%)
        kineticFrictionForce = addRandomness(baseKineticFrictionForce, 0.03);
        staticFrictionForce = addRandomness(baseStaticFrictionForce, 0.03);
        
        // Calculate force based on position with slight randomness
        let rawForce = (pullDistance / 20) * maxPull / 5;
        
        // Block only moves if force exceeds static friction
        let newBlockX = blockInitialX;
        
        if (!isMoving && rawForce > staticFrictionForce) {
            // Block just started moving - static friction overcome
            isMoving = true;
            justStartedMoving = true;
            hasMovedBlock = true;
            
            // Calculate stable kinetic friction force (this will be recorded)
            stableKineticForce = kineticFrictionForce;
            
            // Update kinetic friction display
            kineticForceDisplay.textContent = stableKineticForce.toFixed(2) + " N";
            kineticForceDisplay.classList.add('highlight');
            setTimeout(() => {
                kineticForceDisplay.classList.remove('highlight');
            }, 500);
            
            // After breaking static friction, force drops to kinetic friction
            setTimeout(() => {
                justStartedMoving = false;
            }, 200);
        }
        
        // Determine the current force and block position
        if (isMoving) {
            // If just started moving, show the peak force briefly
            if (justStartedMoving) {
                currentForce = rawForce;
            } else {
                // Once moving, force drops to kinetic friction level
                currentForce = kineticFrictionForce;
            }
            
            // Block moves with the meter, but only after overcoming static friction
            newBlockX = blockInitialX - (pullDistance - (staticFrictionForce * 20 * 5 / maxPull));
            
            // Start wobble effect for kinetic friction
            if (!wobbleInterval && !justStartedMoving) {
                startWobble();
            }
        } else {
            // Block doesn't move, force increases with pull
            currentForce = rawForce;
            newBlockX = blockInitialX;
        }
        
        // Update force display
        forceDisplay.textContent = currentForce.toFixed(2) + " N";
        
        updateMeterPosition(newMeterX);
        updateBlockPosition(newBlockX);
        
        // Update meter reading
         if (!wobbleInterval) {
        updateMeterReading(currentForce);
    }
        
        updateString();
        
        e.preventDefault();
    }
    
    function handleTouchMove(e) {
        drag(e);
    }
    
    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        newtonMeter.classList.remove('dragging');
        
        // Reset positions but keep kinetic friction value
        resetPositions(false);
        
        // Stop wobble
        if (wobbleInterval) {
            clearInterval(wobbleInterval);
            wobbleInterval = null;
        }
        
        isMoving = false;
        justStartedMoving = false;
    }
    
    function handleTouchEnd() {
        endDrag();
    }
    
    function startWobble() {
        // Clear any existing interval
        if (wobbleInterval) {
            clearInterval(wobbleInterval);
        }
        
        // Create wobble effect for the meter reading
        wobbleInterval = setInterval(() => {
            // Add random variation to the friction force (±2%)
            const wobbleAmount = addRandomness(stableKineticForce, 0.05);
            updateMeterReading(wobbleAmount);
            forceDisplay.textContent = wobbleAmount.toFixed(2) + " N";
            
            
            // Don't update the kinetic force display during wobble
            // This keeps the display stable for recording
        }, 150);
    }
    
    function updateBlockPosition(x) {
        blockContainer.style.left = x + 'px';
    }
    
    function updateMeterPosition(x) {
        newtonMeter.style.left = x + 'px';
    }
    
    function updateString() {
        // Calculate string position and length
        const blockLeft = parseInt(blockContainer.style.left) || blockInitialX;
        const meterRight = (parseInt(newtonMeter.style.left) || meterInitialX) + 180;
        
        const stringLeft = meterRight;
        const stringWidth = Math.max(0, blockLeft - meterRight);
        
        string.style.left = stringLeft + 'px';
        string.style.width = stringWidth + 'px';
        
        // Position string to connect to block hook (20px from top of block)
        const blockBottom = parseInt(blockContainer.style.bottom || 30);
        const stringY = experimentArea.offsetHeight - blockBottom - 40; // 40px from bottom of block
        string.style.top = stringY + 'px';
    }
    
    function updateMeterReading(force) {
        // Update meter reading position
        const readingPosition = (force / maxPull) * 160 + 10;
        meterReading.style.left = readingPosition + 'px';
    }
    
    function updateSurface(surfaceType, frictionValue, staticRatio) {
        // Remove previous classes
        surface.classList.remove('surface-wood', 'surface-ice', 'surface-carpet', 'surface-rubber');
        
        // Add new class
        surface.classList.add('surface-' + surfaceType);
        
        // Update friction value
        currentSurface = surfaceType;
        if (frictionValue !== undefined) {
            currentFriction = frictionValue;
            
        }
        
        // Update static friction ratio
        if (staticRatio !== undefined) {
            staticFrictionRatio = staticRatio;
        }
        
        // Reset positions
        resetPositions(true);
        
        // Reset kinetic friction force
        kineticFrictionForce = 0;
        stableKineticForce = 0;
        kineticForceDisplay.textContent = "0.00 N";
        hasMovedBlock = false;
    }
    
    function resetPositions(resetKineticForce = false) {
        updateMeterPosition(meterInitialX);
        updateBlockPosition(blockInitialX);
        updateMeterReading(0);
        updateString();
        currentForce = 0;
        forceDisplay.textContent = "0.00 N";
        
        // Only reset kinetic force if requested
        if (resetKineticForce) {
            kineticFrictionForce = 0;
            stableKineticForce = 0;
            kineticForceDisplay.textContent = "0.00 N";
        }
        
        // Stop wobble if it's running
        if (wobbleInterval) {
            clearInterval(wobbleInterval);
            wobbleInterval = null;
        }
        
        isMoving = false;
        justStartedMoving = false;
    }
    
    function addWeight() {
        if (weightsContainer.children.length >= 5) return; // Maximum 5 weights
        
        const weight = document.createElement('div');
        weight.className = 'weight';
        weightsContainer.appendChild(weight);
        
        blockMass += 0.5;
        updateMassDisplay();
        
        // Reset kinetic friction force when changing mass
        kineticFrictionForce = 0;
        stableKineticForce = 0;
        kineticForceDisplay.textContent = "0.00 N";
        hasMovedBlock = false;
    }
    
    function removeWeight() {
        if (weightsContainer.children.length > 0) {
            weightsContainer.removeChild(weightsContainer.lastChild);
            blockMass -= 0.5;
            updateMassDisplay();
            
            // Reset kinetic friction force when changing mass
            kineticFrictionForce = 0;
            stableKineticForce = 0;
            kineticForceDisplay.textContent = "0.00 N";
            hasMovedBlock = false;
        }
    }
    
    function updateMassDisplay() {
        totalMassDisplay.textContent = `Total: ${blockMass.toFixed(1)} kg`;
    }
    
    function resetExperiment() {
        // Reset positions
        resetPositions(true);
        
        // Clear weights
        weightsContainer.innerHTML = '';
        blockMass = 1.0;
        updateMassDisplay();
        
        // Reset to wood surface
        updateSurface('wood', 0.3, 1.2);
        
        // Update active surface button
        surfaceOptions.forEach(opt => opt.classList.remove('border-blue-500'));
        document.querySelector('[data-surface="wood"]').classList.add('border-blue-500');
        
        // Reset kinetic friction force
        kineticFrictionForce = 0;
        stableKineticForce = 0;
        kineticForceDisplay.textContent = "0.00 N";
        hasMovedBlock = false;
    }
    
    function recordDataPoint() {
        // Allow recording only if block has moved (kinetic friction measured)
        if (!hasMovedBlock || stableKineticForce === 0) {
            showToast("Pull until the block moves first", "warning");
            return;
        }
        
        const row = document.createElement('tr');
        
        // Format surface name with first letter capitalized
        const surfaceName = currentSurface.charAt(0).toUpperCase() + currentSurface.slice(1);
        
        // Use the exact same value shown in the display
        const recordedForce = stableKineticForce;
        
        // Calculate coefficient of friction (F = μ * m * g)
        const calculatedMu = (recordedForce / (blockMass * gravity)).toFixed(2);
        
        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2">${surfaceName}</td>
            <td class="border border-gray-300 px-3 py-2">${blockMass.toFixed(1)}</td>
            <td class="border border-gray-300 px-3 py-2">${recordedForce.toFixed(2)}</td>
            
        `;
        
        // Highlight the new row briefly
        row.style.backgroundColor = "#e6fffa";
        dataTable.appendChild(row);
        
        setTimeout(() => {
            row.style.transition = "background-color 1s ease";
            row.style.backgroundColor = "transparent";
        }, 100);
        
        // Show confirmation toast
        showToast("Data point recorded!");
    }
    
    function showToast(message, type = "success") {
        toast.textContent = message;
        toast.className = "toast";
        
        if (type === "warning") {
            toast.style.backgroundColor = "#ff9800";
        } else {
            toast.style.backgroundColor = "#4CAF50";
        }
        
        toast.classList.add("show");
        
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
});