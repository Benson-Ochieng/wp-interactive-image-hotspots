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
    let loadedConfigs = {};

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper to create point element safely using .val()
    function createPointElement(index, point) {
        const pos = (point && point.position) ? point.position : {};
        const title = (point && point.title !== undefined) ? point.title : '';
        const desc = (point && point.description !== undefined) ? point.description : '';

        const $item = $(`
            <div class="point-item" data-index="${index}">
                <h4>Point ${index + 1}</h4>
                <div class="point-fields">
                    <div class="position-group">
                        <label>Position:</label>
                        <div class="position-inputs">
                            <input type="number" class="pos-input pos-top" name="points[${index}][top]" placeholder="Top %" min="0" max="100">
                            <input type="number" class="pos-input pos-left" name="points[${index}][left]" placeholder="Left %" min="0" max="100">
                            <input type="number" class="pos-input pos-right" name="points[${index}][right]" placeholder="Right %" min="0" max="100">
                            <input type="number" class="pos-input pos-bottom" name="points[${index}][bottom]" placeholder="Bottom %" min="0" max="100">
                            <small>Use either top/left OR right/bottom</small>
                        </div>
                    </div>
                    <input type="text" class="point-title-input" name="points[${index}][title]" placeholder="Point Title" required>
                    <textarea class="point-desc-input" name="points[${index}][description]" placeholder="Point Description" required></textarea>
                    <button type="button" class="remove-point button">Remove Point</button>
                </div>
            </div>
        `);

        // Safely set input values via .val() — immune to quotes, apostrophes, and HTML
        if (pos.top !== undefined && pos.top !== '') $item.find('.pos-top').val(pos.top);
        if (pos.left !== undefined && pos.left !== '') $item.find('.pos-left').val(pos.left);
        if (pos.right !== undefined && pos.right !== '') $item.find('.pos-right').val(pos.right);
        if (pos.bottom !== undefined && pos.bottom !== '') $item.find('.pos-bottom').val(pos.bottom);
        $item.find('.point-title-input').val(title);
        $item.find('.point-desc-input').val(desc);

        return $item;
    }

    // Helper to collect points from form
    function collectPoints() {
        const points = [];
        $('.point-item').each(function () {
            const $item = $(this);
            const point = {
                position: {
                    top: $item.find('.pos-top').val() || $item.find('input[name*="[top]"]').val() || '',
                    left: $item.find('.pos-left').val() || $item.find('input[name*="[left]"]').val() || '',
                    right: $item.find('.pos-right').val() || $item.find('input[name*="[right]"]').val() || '',
                    bottom: $item.find('.pos-bottom').val() || $item.find('input[name*="[bottom]"]').val() || ''
                },
                title: $item.find('.point-title-input').val() || $item.find('input[name*="[title]"]').val() || '',
                description: $item.find('.point-desc-input').val() || $item.find('textarea[name*="[description]"]').val() || ''
            };
            points.push(point);
        });
        return points;
    }

    // Reset form to blank creation state
    function resetForm() {
        $('#pointer-config-form')[0].reset();
        $('#config-id').val('');
        $('#form-heading').text('Create New Pointer Configuration');
        $('#submit-config-btn').text('Save Configuration');
        $('#cancel-edit-btn').hide();
        $('#selected-image-preview').hide();
        $('#select-image-btn').show();
        $('#image-url').val('');
        $('#preview-img').attr('src', '');

        $('#points-container').empty();
        pointCounter = 0;
        const $first = createPointElement(0);
        $('#points-container').append($first);
        pointCounter = 1;
        updateRemoveButtons();
    }

    // Tab switching
    $(document).on('click', '.tab-button', function () {
        const tab = $(this).data('tab');
        $('.tab-button').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').hide();
        $('#' + tab + '-tab').show();

        if (tab === 'manage') {
            loadConfigurations();
        } else if (tab === 'export-import') {
            fetchExportStats();
            syncExportUi($('input[name="dip_export_type"]:checked').val() || 'both');
        }
    });

    // Cancel edit button
    $('#cancel-edit-btn').on('click', function () {
        resetForm();
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
        $('#preview-img').attr('src', '');
        $('#selected-image-preview').hide();
        $('#select-image-btn').show();
    });

    // Add point
    $('#add-point-btn').on('click', function () {
        const $item = createPointElement(pointCounter);
        $('#points-container').append($item);
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
        pointCounter = $('.point-item').length;
    }

    // Save configuration
    $('#pointer-config-form').on('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        formData.append('action', 'save_pointer_config');
        formData.append('nonce', dynamic_pointers_admin.nonce);

        const points = collectPoints();
        formData.delete('points');
        formData.append('points', JSON.stringify(points));

        const $submitBtn = $('#submit-config-btn');
        const origText = $submitBtn.text();
        $submitBtn.prop('disabled', true).text('Saving...');

        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                $submitBtn.prop('disabled', false).text(origText);
                if (response.success) {
                    alert(response.data && response.data.message ? response.data.message : 'Configuration saved successfully!');
                    resetForm();
                    // Switch to manage tab to see updated list
                    $('.tab-button[data-tab="manage"]').click();
                } else {
                    const msg = response.data && response.data.message ? response.data.message : 'Error saving configuration.';
                    alert('Error: ' + msg);
                    console.log('Save error:', response.data);
                }
            },
            error: function (xhr, status, error) {
                $submitBtn.prop('disabled', false).text(origText);
                alert('An error occurred while saving: ' + error);
            }
        });
    });

    // Preview functionality
    $('#preview-btn').on('click', function () {
        const title = $('#config-title').val() || 'Preview';
        const imageUrl = $('#image-url').val();

        if (!imageUrl) {
            alert('Please select an image first.');
            return;
        }

        const points = collectPoints();
        showPreview({ title, image_url: imageUrl, points });
    });

    function showPreview(config) {
        const previewHtml = `
            <div class="dynamic-pointer-container" id="preview-pointer">
                <div class="image-container">
                    <img src="${escapeHtml(config.image_url)}" alt="${escapeHtml(config.title)}" class="diagram-image">
                </div>
                <div class="scroll-panel">
                    <div class="scroll-header">${escapeHtml(config.title || 'Preview')}</div>
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
        $('#configurations-list').html('<p>Loading configurations...</p>');
        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'get_pointer_configs',
                nonce: dynamic_pointers_admin.nonce
            },
            success: function (response) {
                if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                    displayConfigurations(response.data);
                } else {
                    $('#configurations-list').html('<p>No configurations found.</p>');
                }
            },
            error: function () {
                $('#configurations-list').html('<p>Error loading configurations.</p>');
            }
        });
    }

    function displayConfigurations(configs) {
        loadedConfigs = {};
        let html = '';

        configs.forEach(function (config) {
            loadedConfigs[config.id] = config;

            let points = [];
            try {
                points = typeof config.points === 'string' ? JSON.parse(config.points) : (config.points || []);
            } catch (e) {
                console.error('Failed to parse points for config:', config, e);
                points = [];
            }

            const title = config.title || config.config_name;
            const shortcodeAttr = `[dynamic_pointers config=&quot;${escapeHtml(config.config_name)}&quot;]`;

            html += `
                <div class="config-item" data-id="${config.id}">
                    <h3>${escapeHtml(title)}</h3>
                    <p><strong>Config Name:</strong> ${escapeHtml(config.config_name)}</p>
                    <p><strong>Points:</strong> ${points.length}</p>
                    <p><strong>Shortcode:</strong> <code>[dynamic_pointers config="${escapeHtml(config.config_name)}"]</code></p>
                    <p><strong>Last Updated:</strong> ${escapeHtml(config.updated_at || '')}</p>
                    
                    <div class="config-actions">
                        <button type="button" class="button button-primary edit-config" data-id="${config.id}">Edit</button>
                        <button type="button" class="button preview-config" data-id="${config.id}">Preview</button>
                        <button type="button" class="button button-secondary copy-shortcode" data-shortcode="${shortcodeAttr}">Copy Shortcode</button>
                        <button type="button" class="button button-link-delete delete-config" data-id="${config.id}">Delete</button>
                    </div>
                </div>
            `;
        });

        $('#configurations-list').html(html);

        // Also bind in-memory config objects via jQuery .data() to buttons as an additional safeguard
        $('.config-item').each(function () {
            const id = $(this).data('id');
            if (loadedConfigs[id]) {
                $(this).find('.edit-config, .preview-config').data('config', loadedConfigs[id]);
            }
        });
    }

    // Edit configuration
    $(document).on('click', '.edit-config', function () {
        const id = $(this).data('id');
        let config = $(this).data('config') || loadedConfigs[id];

        if (!config && $(this).attr('data-config')) {
            try {
                config = JSON.parse($(this).attr('data-config'));
            } catch (e) {
                console.error('Fallback parse failed', e);
            }
        }

        if (!config) {
            alert('Unable to load configuration data.');
            return;
        }

        let points = [];
        try {
            points = typeof config.points === 'string' ? JSON.parse(config.points) : (config.points || []);
        } catch (e) {
            console.error('Failed to parse points:', e);
            points = [];
        }

        // Switch to create tab
        $('.tab-button[data-tab="create"]').click();

        // Update form heading and buttons for editing state
        $('#form-heading').text('Edit Pointer Configuration: ' + (config.title || config.config_name));
        $('#submit-config-btn').text('Update Configuration');
        $('#cancel-edit-btn').show();

        // Fill form fields safely using .val()
        $('#config-id').val(config.id || '');
        $('#config-name').val(config.config_name || '');
        $('#config-title').val(config.title || '');
        $('#image-url').val(config.image_url || '');

        if (config.image_url) {
            $('#preview-img').attr('src', config.image_url);
            $('#selected-image-preview').show();
            $('#select-image-btn').hide();
        } else {
            $('#preview-img').attr('src', '');
            $('#selected-image-preview').hide();
            $('#select-image-btn').show();
        }

        // Clear existing points
        $('#points-container').empty();
        pointCounter = 0;

        // Populate points safely using DOM / .val()
        if (points.length > 0) {
            points.forEach(function (point, index) {
                const $pointItem = createPointElement(index, point);
                $('#points-container').append($pointItem);
                pointCounter++;
            });
        } else {
            const $pointItem = createPointElement(0);
            $('#points-container').append($pointItem);
            pointCounter = 1;
        }

        updateRemoveButtons();

        // Smooth scroll to top of form
        if ($('#create-tab').length) {
            $('html, body').animate({ scrollTop: $('#create-tab').offset().top - 40 }, 300);
        }
    });

    // Preview configuration
    $(document).on('click', '.preview-config', function () {
        const id = $(this).data('id');
        let config = $(this).data('config') || loadedConfigs[id];

        if (!config && $(this).attr('data-config')) {
            try {
                config = JSON.parse($(this).attr('data-config'));
            } catch (e) {
                console.error('Fallback parse failed', e);
            }
        }

        if (!config) {
            alert('Unable to load configuration data.');
            return;
        }

        let points = [];
        try {
            points = typeof config.points === 'string' ? JSON.parse(config.points) : (config.points || []);
        } catch (e) {
            console.error('Failed to parse points:', e);
            points = [];
        }

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
                    delete loadedConfigs[configId];
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

    // ==========================================
    // Export & Import Handlers
    // ==========================================
    let cachedImportJson = null;
    let selectedImportFile = null;
    let isZipPackage = false;

    // Fetch Export Stats
    function fetchExportStats() {
        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'get_export_stats',
                nonce: dynamic_pointers_admin.nonce
            },
            success: function (res) {
                if (res.success && res.data) {
                    const d = res.data;
                    $('#export-stats-badge')
                        .html(`<span class="dashicons dashicons-database" style="font-size:14px;width:14px;height:14px;vertical-align:middle;margin-right:2px;"></span> <strong>${d.configs_count}</strong> Diagram(s) &bull; <strong>${d.images_count}</strong> Image(s)`)
                        .fadeIn();
                }
            }
        });
    }

    // Toggle Export Options (WPvivid style)
    function syncExportUi(type) {
        const $btnText = $('#btn-export-action-text');
        const $copyBtn = $('#btn-copy-export-json');

        if (type === 'both') {
            $btnText.text('Export & Download Complete Package (ZIP)');
            $copyBtn.addClass('dip-hidden');
        } else if (type === 'json') {
            $btnText.text('Export & Download JSON File (.JSON)');
            $copyBtn.removeClass('dip-hidden');
        } else if (type === 'images') {
            $btnText.text('Export & Download Images (ZIP)');
            $copyBtn.addClass('dip-hidden');
        }
    }

    $('input[name="dip_export_type"]').on('change', function () {
        const type = $(this).val();
        $('.export-option-box').removeClass('active');
        $(this).closest('.export-option-box').addClass('active');
        syncExportUi(type);
    });

    // Run Export (Package ZIP or JSON)
    $('#btn-export-action').on('click', function () {
        const type = $('input[name="dip_export_type"]:checked').val() || 'both';
        const $btn = $(this);
        const originalHtml = $btn.html();

        if (type === 'json') {
            $btn.prop('disabled', true).html('<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Generating JSON...');

            $.ajax({
                url: dynamic_pointers_admin.ajax_url,
                type: 'POST',
                data: {
                    action: 'export_pointer_configs',
                    nonce: dynamic_pointers_admin.nonce
                },
                success: function (response) {
                    $btn.prop('disabled', false).html(originalHtml);
                    if (response.success && response.data) {
                        const jsonString = JSON.stringify(response.data, null, 2);
                        const blob = new Blob([jsonString], { type: 'application/json' });
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        const today = new Date().toISOString().slice(0, 10);
                        a.href = downloadUrl;
                        a.download = `dynamic-pointers-export-${today}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);

                        $('#export-feedback').text(`Export successful! Downloaded ${response.data.count} configuration(s).`).fadeIn().delay(4000).fadeOut();
                    } else {
                        alert('Export failed: ' + (response.data && response.data.message ? response.data.message : 'Unknown error'));
                    }
                },
                error: function (xhr, status, error) {
                    $btn.prop('disabled', false).html(originalHtml);
                    alert('Export failed: ' + error);
                }
            });
        } else {
            // ZIP download ('both' or 'images')
            $btn.prop('disabled', true).html('<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Bundling Package (ZIP)...');

            const downloadUrl = `${dynamic_pointers_admin.ajax_url}?action=export_pointer_package&export_type=${type}&nonce=${dynamic_pointers_admin.nonce}`;
            
            // Trigger download via hidden iframe
            const $iframe = $('<iframe>', { src: downloadUrl, style: 'display:none;' }).appendTo('body');

            setTimeout(function () {
                $btn.prop('disabled', false).html(originalHtml);
                $('#export-feedback').text('Export generated! Check your browser downloads.').fadeIn().delay(5000).fadeOut();
                setTimeout(() => $iframe.remove(), 60000);
            }, 2500);
        }
    });

    // Copy JSON to clipboard
    $('#btn-copy-export-json').on('click', function () {
        const $btn = $(this);
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Copying...');

        $.ajax({
            url: dynamic_pointers_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'export_pointer_configs',
                nonce: dynamic_pointers_admin.nonce
            },
            success: function (response) {
                $btn.prop('disabled', false).html(originalHtml);
                if (response.success && response.data) {
                    const jsonString = JSON.stringify(response.data, null, 2);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(jsonString).then(function () {
                            $btn.text('Copied to Clipboard!');
                            setTimeout(() => $btn.html(originalHtml), 2500);
                        }).catch(function () {
                            fallbackCopy(jsonString);
                        });
                    } else {
                        fallbackCopy(jsonString);
                    }

                    function fallbackCopy(text) {
                        const tempTextarea = $('<textarea>').val(text).appendTo('body').select();
                        document.execCommand('copy');
                        tempTextarea.remove();
                        $btn.text('Copied to Clipboard!');
                        setTimeout(() => $btn.html(originalHtml), 2500);
                    }
                } else {
                    alert('Could not retrieve export data.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).html(originalHtml);
                alert('Could not retrieve export data.');
            }
        });
    });

    // Toggle import source (File vs Paste)
    $('input[name="import_source"]').on('change', function () {
        if ($(this).val() === 'file') {
            $('#import-file-group').show();
            $('#import-text-group').hide();
        } else {
            $('#import-file-group').hide();
            $('#import-text-group').show();
        }
    });

    // Helper to extract origin URL from JSON
    function detectOriginUrl(parsedData) {
        if (parsedData.exported_from) {
            return parsedData.exported_from;
        }
        let list = parsedData.configurations || (Array.isArray(parsedData) ? parsedData : []);
        for (let item of list) {
            if (item && item.image_url) {
                try {
                    const wpIdx = item.image_url.indexOf('/wp-content');
                    if (wpIdx !== -1) {
                        return item.image_url.substring(0, wpIdx);
                    }
                    const parsedUrl = new URL(item.image_url);
                    return parsedUrl.origin;
                } catch (e) {}
            }
        }
        return '';
    }

    // Handle File selection (ZIP or JSON)
    $('#import-json-file').on('change', function (e) {
        cachedImportJson = null;
        selectedImportFile = null;
        isZipPackage = false;

        const file = e.target.files[0];
        if (!file) {
            $('#import-file-info').hide();
            return;
        }

        selectedImportFile = file;
        const fileNameLower = file.name.toLowerCase();

        if (fileNameLower.endsWith('.zip')) {
            isZipPackage = true;
            $('#import-file-info')
                .html(`<span style="color:#007017;">&#128230; <strong>${escapeHtml(file.name)}</strong>: ZIP Package detected! Diagrams and all included media images will be automatically extracted, imported into your Media Library, and linked.</span>`)
                .show();
            $('#url-remap-desc').html('<strong>Notice:</strong> Because you uploaded a ZIP package, diagram image links are automatically remapped to this site. The fields below are optional overrides.');
            return;
        }

        // Reset remapping notice for JSON
        $('#url-remap-desc').text('When migrating with raw JSON from one site to another, this replaces the original site\'s domain with this site\'s URL on diagram images.');

        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                cachedImportJson = evt.target.result;

                let count = 0;
                if (parsed.configurations && Array.isArray(parsed.configurations)) {
                    count = parsed.configurations.length;
                } else if (Array.isArray(parsed)) {
                    count = parsed.length;
                }

                const originUrl = detectOriginUrl(parsed);
                if (originUrl) {
                    $('#import-find-url').val(originUrl);
                }

                $('#import-file-info')
                    .html(`&#10003; <strong>${escapeHtml(file.name)}</strong> loaded: <strong>${count}</strong> configuration(s) detected.` + (originUrl ? ` (Source URL: <code>${escapeHtml(originUrl)}</code>)` : ''))
                    .show();
            } catch (err) {
                $('#import-file-info').html('<span style="color:#d63638;">&#9888; Invalid JSON file. Please select a valid export file.</span>').show();
            }
        };
        reader.readAsText(file);
    });

    // Run Import
    $('#btn-run-import').on('click', function () {
        const importMode = $('input[name="import_source"]:checked').val();
        const findUrl = $('#import-find-url').val().trim();
        const replaceUrl = $('#import-replace-url').val().trim();
        const overwrite = $('#import-overwrite').is(':checked');

        const $btn = $(this);
        const originalHtml = $btn.html();
        const $statusBox = $('#import-status-box');
        $statusBox.hide().empty();

        if (importMode === 'file') {
            if (!selectedImportFile) {
                alert('Please select a backup file (.zip or .json) first.');
                return;
            }

            if (isZipPackage) {
                // Upload ZIP package via FormData
                $btn.prop('disabled', true).html('<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Extracting &amp; Importing Package...');

                const formData = new FormData();
                formData.append('action', 'import_pointer_package');
                formData.append('nonce', dynamic_pointers_admin.nonce);
                formData.append('import_file', selectedImportFile);
                formData.append('overwrite', overwrite ? 'true' : 'false');
                formData.append('find_url', findUrl);
                formData.append('replace_url', replaceUrl);

                $.ajax({
                    url: dynamic_pointers_admin.ajax_url,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        $btn.prop('disabled', false).html(originalHtml);
                        if (response.success) {
                            $statusBox.html(`
                                <div class="notice notice-success inline" style="padding:14px 18px;border-left-color:#46b450;background:#fff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                    <p style="margin:0;font-size:14px;color:#1e4620;">
                                        <strong>&#10004; ${escapeHtml(response.data.message)}</strong>
                                    </p>
                                </div>
                            `).fadeIn();

                            $('#import-json-file').val('');
                            selectedImportFile = null;
                            isZipPackage = false;
                            cachedImportJson = null;
                            $('#import-file-info').hide();

                            loadConfigurations();
                            fetchExportStats();
                        } else {
                            $statusBox.html(`
                                <div class="notice notice-error inline" style="padding:14px 18px;border-left-color:#dc3232;background:#fff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                    <p style="margin:0;font-size:14px;color:#721c24;">
                                        <strong>&#9888; Import Failed:</strong> ${escapeHtml(response.data && response.data.message ? response.data.message : 'Unknown error')}
                                    </p>
                                </div>
                            `).fadeIn();
                        }
                    },
                    error: function (xhr, status, error) {
                        $btn.prop('disabled', false).html(originalHtml);
                        $statusBox.html(`
                            <div class="notice notice-error inline" style="padding:14px 18px;border-left-color:#dc3232;background:#fff;border-radius:4px;">
                                <p style="margin:0;font-size:14px;color:#721c24;">
                                    <strong>&#9888; Server Error:</strong> ${escapeHtml(error)}
                                </p>
                            </div>
                        `).fadeIn();
                    }
                });
                return;
            }

            // JSON file mode
            if (!cachedImportJson) {
                alert('Please select a valid JSON export file first.');
                return;
            }

            runJsonImport(cachedImportJson);
        } else {
            // Text mode
            const rawText = $('#import-json-text').val().trim();
            if (!rawText) {
                alert('Please paste JSON data into the text box.');
                return;
            }
            runJsonImport(rawText);
        }

        function runJsonImport(jsonData) {
            $btn.prop('disabled', true).html('<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Importing Configurations...');

            $.ajax({
                url: dynamic_pointers_admin.ajax_url,
                type: 'POST',
                data: {
                    action: 'import_pointer_configs',
                    nonce: dynamic_pointers_admin.nonce,
                    import_data: jsonData,
                    find_url: findUrl,
                    replace_url: replaceUrl,
                    overwrite: overwrite ? 'true' : 'false'
                },
                success: function (response) {
                    $btn.prop('disabled', false).html(originalHtml);
                    if (response.success) {
                        $statusBox.html(`
                            <div class="notice notice-success inline" style="padding:14px 18px;border-left-color:#46b450;background:#fff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                <p style="margin:0;font-size:14px;color:#1e4620;">
                                    <strong>&#10004; ${escapeHtml(response.data.message)}</strong>
                                </p>
                            </div>
                        `).fadeIn();

                        $('#import-json-file').val('');
                        cachedImportJson = null;
                        selectedImportFile = null;
                        isZipPackage = false;
                        $('#import-file-info').hide();
                        $('#import-json-text').val('');

                        loadConfigurations();
                        fetchExportStats();
                    } else {
                        $statusBox.html(`
                            <div class="notice notice-error inline" style="padding:14px 18px;border-left-color:#dc3232;background:#fff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                <p style="margin:0;font-size:14px;color:#721c24;">
                                    <strong>&#9888; Import Failed:</strong> ${escapeHtml(response.data && response.data.message ? response.data.message : 'Unknown error')}
                                </p>
                            </div>
                        `).fadeIn();
                    }
                },
                error: function (xhr, status, error) {
                    $btn.prop('disabled', false).html(originalHtml);
                    $statusBox.html(`
                        <div class="notice notice-error inline" style="padding:14px 18px;border-left-color:#dc3232;background:#fff;border-radius:4px;">
                            <p style="margin:0;font-size:14px;color:#721c24;">
                                <strong>&#9888; Server Error:</strong> ${escapeHtml(error)}
                            </p>
                        </div>
                    `).fadeIn();
                }
            });
        }
    });

    // Initialize
    updateRemoveButtons();
    fetchExportStats();
    syncExportUi($('input[name="dip_export_type"]:checked').val() || 'both');
});