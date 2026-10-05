// dynamic-pointers.js
class DynamicPointerSystem {
    constructor(containerId, config = null) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // Check if already initialized to prevent duplicates
        if (this.container.dataset.initialized === 'true') {
            console.warn(`DynamicPointerSystem already initialized for container: ${containerId}`);
            return;
        }

        // Mark as initialized
        this.container.dataset.initialized = 'true';

        // Get config from data attribute if not provided
        if (config) {
            this.config = config;
        } else {
            const rawConfig = this.container.getAttribute('data-config');
            try {
                this.config = JSON.parse(rawConfig);
            } catch (err) {
                console.error('DynamicPointerSystem: Failed to parse data-config:', err, rawConfig);
                this.config = { points: [] };
            }
        }

        if (this.config && typeof this.config.points === 'string') {
            try {
                this.config.points = JSON.parse(this.config.points);
            } catch (e) {
                this.config.points = [];
            }
        }
        if (!this.config || !Array.isArray(this.config.points)) {
            this.config = this.config || {};
            this.config.points = [];
        }

        this.activeIndex = 0;
        this.init();
    }

    init() {
        // Clear any existing content to prevent duplicates
        this.clearExistingContent();
        this.createPointers();
        this.createCards();
        this.createDots();
        this.bindEvents();
        this.setActive(0);
    }

    clearExistingContent() {
        // Remove existing pointers
        const existingPointers = this.container.querySelectorAll('.pointer');
        existingPointers.forEach(pointer => pointer.remove());

        // Clear cards container
        const cardsContainer = this.container.querySelector('.items-container');
        if (cardsContainer) {
            cardsContainer.innerHTML = '';
        }

        // Clear dots container
        const dotsContainer = this.container.querySelector('.navigation-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
        }
    }

    createPointers() {
        const imageContainer = this.container.querySelector('.image-container');
        if (!imageContainer) return;

        this.config.points.forEach((point, index) => {
            const pointer = document.createElement('div');
            pointer.className = 'pointer';
            pointer.setAttribute('data-point', index);

            // Handle positioning
            const pos = point.position || {};
            if (pos.top) pointer.style.top = pos.top + '%';
            if (pos.left) pointer.style.left = pos.left + '%';
            if (pos.right) pointer.style.right = pos.right + '%';
            if (pos.bottom) pointer.style.bottom = pos.bottom + '%';

            pointer.textContent = index + 1;
            imageContainer.appendChild(pointer);
        });
    }

    createCards() {
        const container = this.container.querySelector('.items-container');
        if (!container) return;

        this.config.points.forEach((point, index) => {
            const card = document.createElement('div');
            card.className = 'info-card';
            card.setAttribute('data-card', index);

            const numEl = document.createElement('div');
            numEl.className = 'card-number';
            numEl.textContent = index + 1;

            const titleEl = document.createElement('div');
            titleEl.className = 'card-title';
            titleEl.textContent = point.title || '';

            const descEl = document.createElement('div');
            descEl.className = 'card-description';
            descEl.textContent = point.description || '';

            card.appendChild(numEl);
            card.appendChild(titleEl);
            card.appendChild(descEl);

            container.appendChild(card);
        });
    }

    createDots() {
        const dotsContainer = this.container.querySelector('.navigation-dots');
        if (!dotsContainer) return;

        this.config.points.forEach((point, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.setAttribute('data-dot', index);
            dotsContainer.appendChild(dot);
        });
    }

    bindEvents() {
        // Remove existing event listeners first
        this.removeEventListeners();

        // Store bound functions for later removal
        this.boundPointerClick = (e) => {
            const index = parseInt(e.target.getAttribute('data-point'));
            if (!isNaN(index)) {
                this.setActive(index);
                this.scrollToCard(index);
            }
        };

        this.boundCardClick = (e) => {
            const card = e.target.closest('.info-card');
            if (card) {
                const index = parseInt(card.getAttribute('data-card'));
                if (!isNaN(index)) {
                    this.setActive(index);
                    this.scrollToCard(index);
                }
            }
        };


        this.boundDotClick = (e) => {
            const index = parseInt(e.target.getAttribute('data-dot'));
            if (!isNaN(index)) {
                this.setActive(index);
                this.scrollToCard(index);
            }
        };

        this.boundScrollHandler = () => {
            this.updateActiveOnScroll();
        };

        // Bind events using event delegation
        const imageContainer = this.container.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.addEventListener('click', this.boundPointerClick);
        }

        const itemsContainer = this.container.querySelector('.items-container');
        if (itemsContainer) {
            itemsContainer.addEventListener('click', this.boundCardClick);
        }

        const dotsContainer = this.container.querySelector('.navigation-dots');
        if (dotsContainer) {
            dotsContainer.addEventListener('click', this.boundDotClick);
        }

        // Scroll sync
        const scrollContent = this.container.querySelector('.scroll-content');
        if (scrollContent) {
            scrollContent.addEventListener('scroll', this.boundScrollHandler);
        }
    }

    removeEventListeners() {
        if (this.boundPointerClick) {
            const imageContainer = this.container.querySelector('.image-container');
            if (imageContainer) {
                imageContainer.removeEventListener('click', this.boundPointerClick);
            }
        }

        if (this.boundCardClick) {
            const itemsContainer = this.container.querySelector('.items-container');
            if (itemsContainer) {
                itemsContainer.removeEventListener('click', this.boundCardClick);
            }
        }

        if (this.boundDotClick) {
            const dotsContainer = this.container.querySelector('.navigation-dots');
            if (dotsContainer) {
                dotsContainer.removeEventListener('click', this.boundDotClick);
            }
        }

        if (this.boundScrollHandler) {
            const scrollContent = this.container.querySelector('.scroll-content');
            if (scrollContent) {
                scrollContent.removeEventListener('scroll', this.boundScrollHandler);
            }
        }
    }

    setActive(index) {
        // Prevent updating if locked during manual scroll and index doesn't match
        if (this.lockedIndex !== undefined && this.lockedIndex !== null && this.lockedIndex !== index) {
            return;
        }

        this.activeIndex = index;

        // Update pointers
        this.container.querySelectorAll('.pointer').forEach((p, i) => {
            p.classList.toggle('active', i === index);
        });

        // Update cards
        this.container.querySelectorAll('.info-card').forEach((c, i) => {
            c.classList.toggle('active', i === index);
        });

        // Update dots
        this.container.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });
    }

    scrollToCard(index) {
        const scrollContent = this.container.querySelector('.scroll-content');
        const targetCard = this.container.querySelector(`[data-card="${index}"]`);

        if (targetCard && scrollContent) {
            // Instantly sync pointer, dot, and card
            this.setActive(index);

            // Lock until scroll finishes
            this.lockedIndex = index;
            this.isManualScrolling = true;

            // ✅ Center the clicked card fully inside the container
            const newScrollLeft =
                targetCard.offsetLeft -
                (scrollContent.offsetWidth / 2) +
                (targetCard.offsetWidth / 2);

            scrollContent.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });

            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.isManualScrolling = false;
                this.lockedIndex = null;
            }, 700);
        }
    }




    // scrollToCard(index) {
    //     const scrollContent = this.container.querySelector('.scroll-content');
    //     const targetCard = this.container.querySelector(`[data-card="${index}"]`);

    //     if (targetCard && scrollContent) {
    //         const scrollLeft = targetCard.offsetLeft - (scrollContent.offsetWidth / 2) + (targetCard.offsetWidth / 2);
    //         scrollContent.scrollTo({
    //             left: scrollLeft,
    //             behavior: 'smooth'
    //         });
    //     }
    // }

    updateActiveOnScroll() {
        const scrollContent = this.container.querySelector('.scroll-content');
        if (!scrollContent) return;

        const scrollLeft = scrollContent.scrollLeft;
        const firstCard = this.container.querySelector('.info-card');
        if (!firstCard) return;

        const cardWidth = firstCard.offsetWidth + 25;
        const activeIndex = Math.round(scrollLeft / cardWidth);

        if (activeIndex !== this.activeIndex && activeIndex < this.config.points.length && activeIndex >= 0) {
            this.setActive(activeIndex);
        }
    }

    // Method to destroy the instance
    destroy() {
        this.removeEventListeners();
        this.clearExistingContent();
        this.container.dataset.initialized = 'false';
    }
}

// Store instances to prevent duplicates
window.dynamicPointerInstances = window.dynamicPointerInstances || {};

// Auto-initialize all pointer containers on page load
jQuery(document).ready(function ($) {
    $('.dynamic-pointer-container').each(function () {
        const containerId = this.id;

        // Skip if already initialized
        if (window.dynamicPointerInstances[containerId]) {
            return;
        }

        // Create and store instance
        const instance = new DynamicPointerSystem(containerId);
        if (instance.container) {
            window.dynamicPointerInstances[containerId] = instance;
        }
    });
});

// Function to manually initialize a specific container
window.initDynamicPointer = function (containerId, config = null) {
    // Destroy existing instance if it exists
    if (window.dynamicPointerInstances[containerId]) {
        window.dynamicPointerInstances[containerId].destroy();
        delete window.dynamicPointerInstances[containerId];
    }

    // Create new instance
    const instance = new DynamicPointerSystem(containerId, config);
    if (instance.container) {
        window.dynamicPointerInstances[containerId] = instance;
    }
    return instance;
};

// WordPress Admin JavaScript (admin.js)
jQuery(document).ready(function ($) {
    let pointCounter = 1;

    // Tab switching
    $('.tab-button').on('click', function () {
        const tab = $(this).data('tab');
        $('.tab-button').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').hide();
        $('#' + tab + '-tab').show();

        if (tab === 'manage') {
            loadConfigurations();
        }
    });

    // Image selector
    $('#select-image-btn').on('click', function (e) {
        e.preventDefault();

        const mediaUploader = wp.media({
            title: 'Select Image',
            button: { text: 'Use Image' },
            multiple: false,
            library: { type: 'image' }
        });

        mediaUploader.on('select', function () {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            $('#image-url').val(attachment.url);
            $('#preview-img').attr('src', attachment.url);
            $('#selected-image-preview').show();
            $('#select-image-btn').hide();
        });

        mediaUploader.open();
    });

    // Remove image
    $('#remove-image-btn').on('click', function () {
        $('#image-url').val('');
        $('#selected-image-preview').hide();
        $('#select-image-btn').show();
    });

    // Add point
    $('#add-point-btn').on('click', function () {
        const pointHtml = `
            <div class="point-item" data-index="${pointCounter}">
                <h4>Point ${pointCounter + 1}</h4>
                <div class="point-fields">
                    <div class="position-group">
                        <label>Position:</label>
                        <div class="position-inputs">
                            <input type="number" name="points[${pointCounter}][top]" placeholder="Top %" min="0" max="100">
                            <input type="number" name="points[${pointCounter}][left]" placeholder="Left %" min="0" max="100">
                            <input type="number" name="points[${pointCounter}][right]" placeholder="Right %" min="0" max="100">
                            <input type="number" name="points[${pointCounter}][bottom]" placeholder="Bottom %" min="0" max="100">
                            <small>Use either top/left OR right/bottom</small>
                        </div>
                    </div>
                    <input type="text" name="points[${pointCounter}][title]" placeholder="Point Title" required>
                    <textarea name="points[${pointCounter}][description]" placeholder="Point Description" required></textarea>
                    <button type="button" class="remove-point button">Remove Point</button>
                </div>
            </div>
        `;
        $('#points-container').append(pointHtml);
        pointCounter++;
        updateRemoveButtons();
    });

    // Remove point
    $(document).on('click', '.remove-point', function () {
        $(this).closest('.point-item').remove();
        updateRemoveButtons();
        renumberPoints();
    });

    function updateRemoveButtons() {
        const pointItems = $('.point-item');
        if (pointItems.length > 1) {
            $('.remove-point').show();
        } else {
            $('.remove-point').hide();
        }
    }

    function renumberPoints() {
        $('.point-item').each(function (index) {
            $(this).find('h4').text('Point ' + (index + 1));
            $(this).attr('data-index', index);

            // Update input names
            $(this).find('input, textarea').each(function () {
                const name = $(this).attr('name');
                if (name) {
                    const newName = name.replace(/\[\d+\]/, '[' + index + ']');
                    $(this).attr('name', newName);
                }
            });
        });
    }

    // Save configuration
    $('#pointer-config-form').on('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        formData.append('action', 'save_pointer_config');
        formData.append('nonce', dynamic_pointers_admin.nonce);

        // Convert form data to proper format
        const points = [];
        $('.point-item').each(function () {
            const $item = $(this);
            const index = $item.data('index');

            const point = {
                position: {
                    top: $item.find(`input[name="points[${index}][top]"]`).val() || '',
                    left: $item.find(`input[name="points[${index}][left]"]`).val() || '',
                    right: $item.find(`input[name="points[${index}][right]"]`).val() || '',
                    bottom: $item.find(`input[name="points[${index}][bottom]"]`).val() || ''
                },
                title: $item.find(`input[name="points[${index}][title]"]`).val(),
                description: $item.find(`textarea[name="points[${index}][description]"]`).val()
            };
            points.push(point);
        });

        formData.delete('points');
        formData.append('points', JSON.stringify(points));

        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    alert('Configuration saved successfully!');
                    $('#pointer-config-form')[0].reset();
                    $('#selected-image-preview').hide();
                    $('#select-image-btn').show();
                } else {
                    console.log('Error: ' + response.data.message);
                }
            },
            error: function () {
                alert('An error occurred while saving.');
            }
        });
    });

    // Preview functionality
    $('#preview-btn').on('click', function () {
        const configName = $('#config-name').val();
        const title = $('#config-title').val() || 'Preview';
        const imageUrl = $('#image-url').val();

        if (!imageUrl) {
            alert('Please select an image first.');
            return;
        }

        // Collect points
        const points = [];
        $('.point-item').each(function () {
            const $item = $(this);
            const index = $item.data('index');

            const point = {
                position: {
                    top: $item.find(`input[name="points[${index}][top]"]`).val() || '',
                    left: $item.find(`input[name="points[${index}][left]"]`).val() || '',
                    right: $item.find(`input[name="points[${index}][right]"]`).val() || '',
                    bottom: $item.find(`input[name="points[${index}][bottom]"]`).val() || ''
                },
                title: $item.find(`input[name="points[${index}][title]"]`).val() || 'Point ' + (index + 1),
                description: $item.find(`textarea[name="points[${index}][description]"]`).val() || 'No description'
            };
            points.push(point);
        });

        showPreview({ title, image_url: imageUrl, points });
    });

    function showPreview(config) {
        const previewHtml = `
            <div class="dynamic-pointer-container" id="preview-pointer">
                <div class="image-container" style="height: 400px;">
                    <img src="${config.image_url}" alt="${config.title}" class="diagram-image">
                </div>
                <div class="scroll-panel">
                    <div class="scroll-header">${config.title}</div>
                    <div class="scroll-content">
                        <div class="items-container"></div>
                    </div>
                    <div class="navigation-dots"></div>
                </div>
            </div>
        `;

        $('#preview-container').html(previewHtml);
        $('#preview-modal').show();

        // Initialize preview using the global function
        window.initDynamicPointer('preview-pointer', config);
    }

    // Close modal
    $('.close, #preview-modal').on('click', function (e) {
        if (e.target === this) {
            $('#preview-modal').hide();
            // Clean up preview instance
            if (window.dynamicPointerInstances['preview-pointer']) {
                window.dynamicPointerInstances['preview-pointer'].destroy();
                delete window.dynamicPointerInstances['preview-pointer'];
            }
        }
    });

    function loadConfigurations() {
        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'get_pointer_configs',
                nonce: dynamic_pointers_admin.nonce
            },
            success: function (response) {
                if (response.success) {
                    displayConfigurations(response.data);
                } else {
                    $('#configurations-list').html('<p>No configurations found.</p>');
                }
            }
        });
    }

    function displayConfigurations(configs) {
        let html = '';

        configs.forEach(function (config) {
            const points = JSON.parse(config.points);
            html += `
                <div class="config-item">
                    <h3>${config.title || config.config_name}</h3>
                    <p><strong>Config Name:</strong> ${config.config_name}</p>
                    <p><strong>Points:</strong> ${points.length}</p>
                    <p><strong>Shortcode:</strong> <code>[dynamic_pointers config="${config.config_name}"]</code></p>
                    <p><strong>Last Updated:</strong> ${config.updated_at}</p>
                    
                    <div class="config-actions">
                        <button class="button edit-config" data-config='${JSON.stringify(config)}'>Edit</button>
                        <button class="button preview-config" data-config='${JSON.stringify(config)}'>Preview</button>
                        <button class="button button-secondary copy-shortcode" data-shortcode="[dynamic_pointers config=&quot;${config.config_name}&quot;]">Copy Shortcode</button>
                        <button class="button button-link-delete delete-config" data-id="${config.id}">Delete</button>
                    </div>
                </div>
            `;
        });

        $('#configurations-list').html(html);
    }

    // Edit configuration
    $(document).on('click', '.edit-config', function () {
        const config = JSON.parse($(this).attr('data-config'));
        const points = JSON.parse(config.points);

        // Switch to create tab
        $('.tab-button[data-tab="create"]').click();

        // Fill form
        $('#config-name').val(config.config_name);
        $('#config-title').val(config.title);
        $('#image-url').val(config.image_url);

        if (config.image_url) {
            $('#preview-img').attr('src', config.image_url);
            $('#selected-image-preview').show();
            $('#select-image-btn').hide();
        }

        // Clear existing points
        $('#points-container').empty();
        pointCounter = 0;

        // Add points
        points.forEach(function (point, index) {
            const pointHtml = `
                <div class="point-item" data-index="${index}">
                    <h4>Point ${index + 1}</h4>
                    <div class="point-fields">
                        <div class="position-group">
                            <label>Position:</label>
                            <div class="position-inputs">
                                <input type="number" name="points[${index}][top]" placeholder="Top %" min="0" max="100" value="${point.position.top || ''}">
                                <input type="number" name="points[${index}][left]" placeholder="Left %" min="0" max="100" value="${point.position.left || ''}">
                                <input type="number" name="points[${index}][right]" placeholder="Right %" min="0" max="100" value="${point.position.right || ''}">
                                <input type="number" name="points[${index}][bottom]" placeholder="Bottom %" min="0" max="100" value="${point.position.bottom || ''}">
                                <small>Use either top/left OR right/bottom</small>
                            </div>
                        </div>
                        <input type="text" name="points[${index}][title]" placeholder="Point Title" required value="${point.title}">
                        <textarea name="points[${index}][description]" placeholder="Point Description" required>${point.description}</textarea>
                        <button type="button" class="remove-point button" ${index === 0 ? 'style="display:none;"' : ''}>Remove Point</button>
                    </div>
                </div>
            `;
            $('#points-container').append(pointHtml);
            pointCounter++;
        });

        updateRemoveButtons();
    });

    // Preview configuration
    $(document).on('click', '.preview-config', function () {
        const config = JSON.parse($(this).attr('data-config'));
        const points = JSON.parse(config.points);

        showPreview({
            title: config.title,
            image_url: config.image_url,
            points: points
        });
    });

    // Copy shortcode
    $(document).on('click', '.copy-shortcode', function () {
        const shortcode = $(this).data('shortcode');

        // Create temporary input
        const tempInput = $('<input>');
        $('body').append(tempInput);
        tempInput.val(shortcode).select();
        document.execCommand('copy');
        tempInput.remove();

        // Show feedback
        const originalText = $(this).text();
        $(this).text('Copied!');
        setTimeout(() => {
            $(this).text(originalText);
        }, 2000);
    });

    // Delete configuration
    $(document).on('click', '.delete-config', function () {
        if (!confirm('Are you sure you want to delete this configuration?')) {
            return;
        }

        const configId = $(this).data('id');
        const $configItem = $(this).closest('.config-item');

        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'delete_pointer_config',
                config_id: configId,
                nonce: dynamic_pointers_admin.nonce
            },
            success: function (response) {
                if (response.success) {
                    $configItem.fadeOut(300, function () {
                        $(this).remove();
                    });
                    alert('Configuration deleted successfully!');
                } else {
                    alert('Error: ' + response.data.message);
                }
            },
            error: function () {
                alert('An error occurred while deleting.');
            }
        });
    });

    // Initialize
    updateRemoveButtons();
});