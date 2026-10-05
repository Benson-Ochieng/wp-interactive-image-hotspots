<?php
/**
 * Plugin Name:       WP Dynamic Image Pointers: Interactive Diagram Hotspots
 * Plugin URI:        https://github.com/Benson-Ochieng/wp-dynamic-image-pointers
 * Description:       Create interactive image diagrams with synchronized hotspot callouts and scrollable specs.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Ben
 * Author URI:        @markos_mark99
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       dynamic-image-pointers
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class DynamicImagePointers {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_save_pointer_config', array($this, 'save_pointer_config'));
        add_action('wp_ajax_get_pointer_configs', array($this, 'get_pointer_configs'));
        add_action('wp_ajax_delete_pointer_config', array($this, 'delete_pointer_config'));
        add_action('wp_ajax_export_pointer_configs', array($this, 'export_pointer_configs'));
        add_action('wp_ajax_export_pointer_package', array($this, 'export_pointer_package'));
        add_action('wp_ajax_get_export_stats', array($this, 'get_export_stats'));
        add_action('wp_ajax_import_pointer_configs', array($this, 'import_pointer_configs'));
        add_action('wp_ajax_import_pointer_package', array($this, 'import_pointer_package'));
        add_shortcode('dynamic_pointers', array($this, 'render_shortcode'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
    }
    
    public function init() {
        $this->create_tables();
    }
    
    private function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            config_name varchar(255) NOT NULL,
            image_url text NOT NULL,
            title varchar(255) DEFAULT '',
            points longtext NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY config_name (config_name)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public function enqueue_scripts() {
        $css_ver = file_exists(plugin_dir_path(__FILE__) . 'assets/dynamic-pointers.css') ? filemtime(plugin_dir_path(__FILE__) . 'assets/dynamic-pointers.css') : '1.0.1';
        $js_ver  = file_exists(plugin_dir_path(__FILE__) . 'assets/dynamic-pointers.js') ? filemtime(plugin_dir_path(__FILE__) . 'assets/dynamic-pointers.js') : '1.0.1';

        wp_enqueue_script('dynamic-pointers-js', plugin_dir_url(__FILE__) . 'assets/dynamic-pointers.js', array('jquery'), $js_ver, true);
        wp_enqueue_style('dynamic-pointers-css', plugin_dir_url(__FILE__) . 'assets/dynamic-pointers.css', array(), $css_ver);
        
        wp_localize_script('dynamic-pointers-js', 'dynamic_pointers_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dynamic_pointers_nonce')
        ));
    }
    
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'dynamic-pointers') === false) {
            return;
        }
        
        $admin_css_ver = file_exists(plugin_dir_path(__FILE__) . 'assets/admin.css') ? filemtime(plugin_dir_path(__FILE__) . 'assets/admin.css') : '1.0.1';
        $admin_js_ver  = file_exists(plugin_dir_path(__FILE__) . 'assets/admin.js') ? filemtime(plugin_dir_path(__FILE__) . 'assets/admin.js') : '1.0.1';

        wp_enqueue_media();
        wp_enqueue_script('dynamic-pointers-admin-js', plugin_dir_url(__FILE__) . 'assets/admin.js', array('jquery'), $admin_js_ver, true);
        wp_enqueue_style('dynamic-pointers-admin-css', plugin_dir_url(__FILE__) . 'assets/admin.css', array(), $admin_css_ver);
        
        wp_localize_script('dynamic-pointers-admin-js', 'dynamic_pointers_admin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dynamic_pointers_nonce')
        ));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Dynamic Pointers',
            'Dynamic Pointers',
            'manage_options',
            'dynamic-pointers',
            array($this, 'admin_page'),
            'dashicons-location-alt',
            30
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Dynamic Image Pointers</h1>
            
            <div class="pointer-admin-container">
                <div class="admin-tabs">
                    <button class="tab-button active" data-tab="create">Create New</button>
                    <button class="tab-button" data-tab="manage">Manage Existing</button>
                    <button class="tab-button" data-tab="export-import">Export / Import</button>
                </div>
                
                <div class="tab-content" id="create-tab">
                    <div class="admin-form">
                        <h2 id="form-heading">Create New Pointer Configuration</h2>
                        
                        <form id="pointer-config-form">
                            <input type="hidden" id="config-id" name="id" value="">
                            <div class="form-group">
                                <label for="config-name">Configuration Name:</label>
                                <input type="text" id="config-name" name="config_name" required 
                                       placeholder="e.g., printer-diagram, equipment-layout">
                                <small>This will be used in your shortcode</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="config-title">Title:</label>
                                <input type="text" id="config-title" name="title" 
                                       placeholder="Equipment Components">
                            </div>
                            
                            <div class="form-group">
                                <label>Select Image:</label>
                                <div class="image-selector">
                                    <button type="button" id="select-image-btn" class="button">Select Image</button>
                                    <div id="selected-image-preview" style="display:none;">
                                        <img id="preview-img" src="" alt="" style="max-width: 300px; height: auto;">
                                        <button type="button" id="remove-image-btn" class="button">Remove</button>
                                    </div>
                                    <input type="hidden" id="image-url" name="image_url">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Pointer Configuration:</label>
                                <div id="points-container">
                                    <div class="point-item" data-index="0">
                                        <h4>Point 1</h4>
                                        <div class="point-fields">
                                            <div class="position-group">
                                                <label>Position:</label>
                                                <div class="position-inputs">
                                                    <input type="number" class="pos-input pos-top" name="points[0][top]" placeholder="Top %" min="0" max="100">
                                                    <input type="number" class="pos-input pos-left" name="points[0][left]" placeholder="Left %" min="0" max="100">
                                                    <input type="number" class="pos-input pos-right" name="points[0][right]" placeholder="Right %" min="0" max="100">
                                                    <input type="number" class="pos-input pos-bottom" name="points[0][bottom]" placeholder="Bottom %" min="0" max="100">
                                                    <small>Use either top/left OR right/bottom</small>
                                                </div>
                                            </div>
                                            <input type="text" class="point-title-input" name="points[0][title]" placeholder="Point Title" required>
                                            <textarea class="point-desc-input" name="points[0][description]" placeholder="Point Description" required></textarea>
                                            <button type="button" class="remove-point button" style="display:none;">Remove Point</button>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" id="add-point-btn" class="button">Add Another Point</button>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" id="submit-config-btn" class="button-primary">Save Configuration</button>
                                <button type="button" id="cancel-edit-btn" class="button" style="display:none; margin-left: 5px;">Cancel Edit</button>
                                <button type="button" id="preview-btn" class="button">Preview</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="tab-content" id="manage-tab" style="display:none;">
                    <h2>Existing Configurations</h2>
                    <div id="configurations-list">
                        <!-- Loaded via AJAX -->
                    </div>
                </div>

                <div class="tab-content" id="export-import-tab" style="display:none;">
                    <div class="export-import-layout">
                        <!-- Left / Main Column: Actions -->
                        <div class="export-import-main">
                            <!-- Export Section -->
                            <div class="dip-card export-card">
                                <div class="dip-card-header">
                                    <span class="dashicons dashicons-database-export" style="font-size:24px;width:24px;height:24px;color:#2271b1;margin-right:8px;"></span>
                                    <h2>Export Configurations &amp; Images</h2>
                                    <span id="export-stats-badge" class="dip-badge dip-badge-info" style="margin-left:auto;display:none;">Loading stats...</span>
                                </div>
                                <p class="description">Select what you would like to export. You can bundle all configurations and their images into a complete ZIP package, or export configurations or images individually.</p>
                                
                                <!-- Export Type Selector (WPvivid-inspired) -->
                                <div class="export-options-grid">
                                    <label class="export-option-box active" for="export-type-both">
                                        <div class="export-option-radio">
                                            <input type="radio" id="export-type-both" name="dip_export_type" value="both" checked>
                                        </div>
                                        <div class="export-option-content">
                                            <div class="export-option-title">
                                                <span class="dashicons dashicons-archive"></span>
                                                <strong>Configurations + Images (Complete ZIP Package)</strong>
                                                <span class="dip-pill dip-pill-rec">Recommended</span>
                                            </div>
                                            <div class="export-option-desc">
                                                Bundles all pointer configuration JSON data <em>and</em> all referenced diagram images into a single <code>.zip</code> file. Best for complete backups and seamless site-to-site migration.
                                            </div>
                                        </div>
                                    </label>

                                    <label class="export-option-box" for="export-type-json">
                                        <div class="export-option-radio">
                                            <input type="radio" id="export-type-json" name="dip_export_type" value="json">
                                        </div>
                                        <div class="export-option-content">
                                            <div class="export-option-title">
                                                <span class="dashicons dashicons-media-code"></span>
                                                <strong>Configurations Only (.JSON File)</strong>
                                            </div>
                                            <div class="export-option-desc">
                                                Downloads only the lightweight <code>.json</code> data containing hot-spot coordinates, titles, and descriptions. Diagram images are not bundled.
                                            </div>
                                        </div>
                                    </label>

                                    <label class="export-option-box" for="export-type-images">
                                        <div class="export-option-radio">
                                            <input type="radio" id="export-type-images" name="dip_export_type" value="images">
                                        </div>
                                        <div class="export-option-content">
                                            <div class="export-option-title">
                                                <span class="dashicons dashicons-format-image"></span>
                                                <strong>Images Only (ZIP Package)</strong>
                                            </div>
                                            <div class="export-option-desc">
                                                Finds all distinct diagram images used across your pointer configurations and packages them into a <code>.zip</code> archive without JSON data.
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div class="dip-action-row" style="margin-top: 20px;">
                                    <button type="button" id="btn-export-action" class="button button-primary button-hero dip-export-btn">
                                        <span class="dashicons dashicons-download"></span>
                                        <span id="btn-export-action-text">Export &amp; Download Complete Package (ZIP)</span>
                                    </button>
                                    <button type="button" id="btn-copy-export-json" class="button button-secondary button-hero dip-export-btn dip-hidden" style="display:none;">
                                        <span class="dashicons dashicons-clipboard"></span>
                                        <span>Copy JSON to Clipboard</span>
                                    </button>
                                </div>
                                <div id="export-feedback" style="display:none;margin-top:12px;font-weight:600;color:#007017;"></div>
                            </div>

                            <!-- Import Section -->
                            <div class="dip-card import-card" style="margin-top:25px;">
                                <div class="dip-card-header">
                                    <span class="dashicons dashicons-database-import" style="font-size:24px;width:24px;height:24px;color:#2271b1;margin-right:8px;"></span>
                                    <h2>Import Configurations &amp; Media</h2>
                                </div>
                                <p class="description">Upload a complete <code>.zip</code> backup package or a <code>.json</code> export file to restore diagrams into this site. When uploading a ZIP package, diagram images are automatically imported into your WordPress Media Library and linked!</p>

                                <div class="import-source-selection" style="margin: 15px 0;">
                                    <label style="font-weight:600;margin-right:20px;cursor:pointer;">
                                        <input type="radio" name="import_source" value="file" checked> Upload Backup Package / JSON File
                                    </label>
                                    <label style="font-weight:600;cursor:pointer;">
                                        <input type="radio" name="import_source" value="text"> Paste Raw JSON
                                    </label>
                                </div>

                                <div id="import-file-group" class="form-group">
                                    <label for="import-json-file">Select Backup File (.zip or .json):</label>
                                    <input type="file" id="import-json-file" accept=".zip,.json,application/zip,application/x-zip-compressed,application/json" style="padding:6px;background:#fff;border:1px solid #ccd0d4;border-radius:4px;width:100%;max-width:550px;">
                                    <div id="import-file-info" style="display:none;margin-top:8px;font-size:13px;color:#0073aa;font-weight:600;"></div>
                                </div>

                                <div id="import-text-group" class="form-group" style="display:none;">
                                    <label for="import-json-text">Paste JSON Code:</label>
                                    <textarea id="import-json-text" rows="8" style="width:100%;max-width:700px;font-family:monospace;font-size:12px;" placeholder="Paste JSON array or export object here..."></textarea>
                                </div>

                                <!-- Automatic Image URL Remapping -->
                                <div class="url-remap-panel" id="url-remap-panel" style="background:#f0f6fc;border:1px solid #c8d8ea;border-radius:6px;padding:16px;margin:20px 0;">
                                    <h3 style="margin:0 0 8px 0;font-size:14px;color:#0c4a6e;display:flex;align-items:center;">
                                        <span class="dashicons dashicons-admin-links" style="margin-right:6px;color:#0284c7;"></span>
                                        Image URL Remapping
                                    </h3>
                                    <p id="url-remap-desc" style="margin:0 0 12px 0;font-size:13px;color:#50575e;">
                                        When migrating with raw JSON from one site to another, this replaces the original site's domain with this site's URL on diagram images. (Note: When uploading a ZIP package with images, image URLs are remapped to this site automatically).
                                    </p>
                                    <div style="display:flex;gap:15px;flex-wrap:wrap;">
                                        <div style="flex:1;min-width:200px;">
                                            <label for="import-find-url" style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Original Site URL to Find:</label>
                                            <input type="text" id="import-find-url" style="width:100%;" placeholder="e.g. http://example.com">
                                        </div>
                                        <div style="flex:1;min-width:200px;">
                                            <label for="import-replace-url" style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">New Site URL (Replace With):</label>
                                            <input type="text" id="import-replace-url" style="width:100%;" value="<?php echo esc_attr(site_url()); ?>">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group" style="margin: 15px 0;">
                                    <label style="cursor:pointer;">
                                        <input type="checkbox" id="import-overwrite" checked value="1">
                                        <strong>Overwrite existing configurations</strong> with matching configuration names.
                                    </label>
                                </div>

                                <div class="dip-action-row" style="margin-top:20px;">
                                    <button type="button" id="btn-run-import" class="button button-primary button-hero">
                                        <span class="dashicons dashicons-upload" style="vertical-align:text-bottom;margin-right:4px;"></span> Import Configurations
                                    </button>
                                </div>

                                <div id="import-status-box" style="display:none;margin-top:20px;"></div>
                            </div>
                        </div>

                        <!-- Right Column: Instructions / Documentation Sidebar -->
                        <div class="export-import-sidebar">
                            <div class="dip-card doc-sidebar-card">
                                <div class="dip-card-header">
                                    <span class="dashicons dashicons-book-alt" style="font-size:22px;width:22px;height:22px;color:#2271b1;margin-right:8px;"></span>
                                    <h2>Instructions &amp; Help</h2>
                                </div>

                                <div class="doc-section">
                                    <h3 class="doc-section-title">
                                        <span class="dashicons dashicons-airplane" style="color:#0284c7;vertical-align:middle;margin-right:4px;"></span>
                                        Step-by-Step Migration
                                    </h3>
                                    
                                    <ol class="doc-step-list">
                                        <li>
                                            <strong>Export Complete Backup:</strong>
                                            <span>Select <code style="font-size:11px;">Configurations + Images (Complete ZIP Package)</code> and click <em>Export &amp; Download</em>. Both JSON and images are packed into one <code>.zip</code> file.</span>
                                        </li>
                                        <li>
                                            <strong>Activate Plugin on New Site:</strong>
                                            <span>Install and activate <code>dynamic-image-pointers</code> on your new WordPress site.</span>
                                        </li>
                                        <li>
                                            <strong>Import the ZIP Package:</strong>
                                            <span>Go to this <em>Export / Import</em> tab on the new site, select the <code>.zip</code> file, and click <em>Import Configurations</em>.</span>
                                        </li>
                                        <li>
                                            <strong>Automatic Media &amp; Linking:</strong>
                                            <span>Images inside the ZIP are automatically extracted into your new site's WordPress Media Library and linked to each diagram. No FTP or manual copying needed!</span>
                                        </li>
                                        <li>
                                            <strong>Embed Shortcodes:</strong>
                                            <span>Use <code>[dynamic_pointers config="NAME"]</code> anywhere on your pages or posts.</span>
                                        </li>
                                    </ol>
                                </div>

                                <div class="doc-section" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f0f0f1;">
                                    <h3 class="doc-section-title">
                                        <span class="dashicons dashicons-lightbulb" style="color:#eab308;vertical-align:middle;margin-right:4px;"></span>
                                        Key Tips &amp; FAQ
                                    </h3>
                                    <ul class="doc-tips-list">
                                        <li>
                                            <strong>Zero Database Hassle:</strong>
                                            You don't need phpMyAdmin or SQL scripts. The plugin handles table creation and records automatically.
                                        </li>
                                        <li>
                                            <strong>Automatic Media Import:</strong>
                                            When importing a ZIP, all diagram images are added to your new site's Media Library automatically with full WordPress attachment metadata.
                                        </li>
                                        <li>
                                            <strong>Updating Existing Diagrams:</strong>
                                            Leaving <em>"Overwrite existing configurations"</em> checked safely updates point coordinates or text without breaking any shortcodes.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="preview-modal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <div id="preview-container"></div>
                </div>
            </div>
        </div>
        
        <style>
        .pointer-admin-container { max-width: 1200px; margin: 20px 0; }
        .admin-tabs { border-bottom: 1px solid #ccc; margin-bottom: 20px; }
        .tab-button { background: none; border: none; padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-button.active { border-bottom-color: #0073aa; color: #0073aa; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group textarea { width: 100%; max-width: 500px; }
        .point-item { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .position-inputs { display: flex; gap: 10px; flex-wrap: wrap; }
        .position-inputs input { max-width: 80px; }
        .modal { position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal-content { background: white; margin: 5% auto; padding: 20px; width: 90%; max-width: 1200px; border-radius: 5px; position: relative; }
        .close { position: absolute; top: 10px; right: 20px; font-size: 28px; cursor: pointer; }
        .config-item { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
        .config-actions { margin-top: 10px; }
        </style>
        <?php
    }

   public function save_pointer_config() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        global $wpdb;
        $table_name      = $wpdb->prefix . 'dynamic_pointers';
        $charset_collate = $wpdb->get_charset_collate();

        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            $sql = "CREATE TABLE {$table_name} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                config_name varchar(191) NOT NULL,
                title varchar(255) NOT NULL,
                image_url text NOT NULL,
                points longtext NOT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY config_name (config_name)
            ) {$charset_collate};";
            dbDelta($sql);
        }

        // Clean and prepare values with wp_unslash to remove magic quotes added by WP
        $id          = isset($_POST['id']) ? intval($_POST['id']) : 0;
        $config_name = isset($_POST['config_name']) ? sanitize_text_field(wp_unslash($_POST['config_name'])) : '';
        $title       = isset($_POST['title']) ? sanitize_text_field(wp_unslash($_POST['title'])) : '';
        $image_url   = isset($_POST['image_url']) ? esc_url_raw(wp_unslash($_POST['image_url'])) : '';
        
        // Handle points data safely
        $points_raw  = isset($_POST['points']) ? wp_unslash($_POST['points']) : '';
        $points_data = json_decode($points_raw, true);

        if (is_array($points_data)) {
            $sanitized_points = array();
            foreach ($points_data as $pt) {
                $sanitized_points[] = array(
                    'position' => array(
                        'top'    => isset($pt['position']['top']) ? sanitize_text_field($pt['position']['top']) : '',
                        'left'   => isset($pt['position']['left']) ? sanitize_text_field($pt['position']['left']) : '',
                        'right'  => isset($pt['position']['right']) ? sanitize_text_field($pt['position']['right']) : '',
                        'bottom' => isset($pt['position']['bottom']) ? sanitize_text_field($pt['position']['bottom']) : '',
                    ),
                    'title'       => isset($pt['title']) ? sanitize_text_field($pt['title']) : '',
                    'description' => isset($pt['description']) ? sanitize_textarea_field($pt['description']) : '',
                );
            }
            $points = wp_json_encode($sanitized_points);
        } else {
            $points = $points_raw;
        }

        if (empty($config_name)) {
            wp_send_json_error(array('message' => 'Configuration name is required.'));
            return;
        }

        $data = array(
            'config_name' => $config_name,
            'title'       => $title,
            'image_url'   => $image_url,
            'points'      => $points,
        );
        $format = array('%s', '%s', '%s', '%s');

        // Check if updating an existing record by ID
        if ($id > 0) {
            $result = $wpdb->update(
                $table_name,
                $data,
                array('id' => $id),
                $format,
                array('%d')
            );
        } else {
            $result = $wpdb->replace(
                $table_name,
                $data,
                $format
            );
        }

        if ($result !== false) {
            wp_send_json_success(array('message' => 'Configuration saved successfully!'));
        } else {
            wp_send_json_error(array(
                'message'  => 'Failed to save configuration.',
                'db_error' => $wpdb->last_error,
            ));
        }
    }



    public function get_pointer_configs() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        $configs = $wpdb->get_results("SELECT * FROM $table_name ORDER BY updated_at DESC");
        
        wp_send_json_success($configs);
    }
    
    public function delete_pointer_config() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        $config_id = intval($_POST['config_id']);
        
        $result = $wpdb->delete($table_name, array('id' => $config_id), array('%d'));
        
        if ($result !== false) {
            wp_send_json_success(array('message' => 'Configuration deleted successfully!'));
        } else {
            wp_send_json_error(array('message' => 'Failed to delete configuration.'));
        }
    }

    /**
     * Resolves the local filesystem path for a given image URL.
     */
    public function find_image_local_path($image_url) {
        if (empty($image_url)) {
            return false;
        }

        // Clean query strings or hashes
        $clean_url = strtok($image_url, '?#');

        // 1. Try WordPress attachment lookup
        $attachment_id = attachment_url_to_postid($clean_url);
        if ($attachment_id) {
            $file = get_attached_file($attachment_id);
            if ($file && file_exists($file)) {
                return $file;
            }
        }

        // 2. Try wp_upload_dir() resolution
        $upload_dir = wp_upload_dir();
        $base_url   = preg_replace('#^https?:#', '', $upload_dir['baseurl']);
        $test_url   = preg_replace('#^https?:#', '', $clean_url);

        if (strpos($test_url, $base_url) === 0) {
            $relative = substr($test_url, strlen($base_url));
            $file = $upload_dir['basedir'] . str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $relative);
            if (file_exists($file)) {
                return $file;
            }
        }

        // 3. Try matching against /wp-content/
        $content_pos = strpos($clean_url, '/wp-content/');
        if ($content_pos !== false) {
            $rel_content = substr($clean_url, $content_pos + strlen('/wp-content/'));
            $file = WP_CONTENT_DIR . DIRECTORY_SEPARATOR . str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $rel_content);
            if (file_exists($file)) {
                return $file;
            }

            // Also check relative to ABSPATH
            $rel_root = substr($clean_url, $content_pos);
            $file = ABSPATH . ltrim(str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $rel_root), DIRECTORY_SEPARATOR);
            if (file_exists($file)) {
                return $file;
            }
        }

        return false;
    }

    /**
     * AJAX endpoint: Get export statistics (count of configs and images).
     */
    public function get_export_stats() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Unauthorized'));
            return;
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            wp_send_json_success(array(
                'configs_count' => 0,
                'images_count'  => 0,
                'local_found'   => 0
            ));
            return;
        }

        $configs = $wpdb->get_results("SELECT id, image_url FROM $table_name");
        $unique_images = array();
        $local_found = 0;

        foreach ($configs as $cfg) {
            $img = trim($cfg->image_url);
            if (!empty($img) && !isset($unique_images[$img])) {
                $unique_images[$img] = true;
                if ($this->find_image_local_path($img)) {
                    $local_found++;
                }
            }
        }

        wp_send_json_success(array(
            'configs_count' => count($configs),
            'images_count'  => count($unique_images),
            'local_found'   => $local_found
        ));
    }

    public function export_pointer_configs() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Unauthorized'));
            return;
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        // Ensure table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            wp_send_json_success(array(
                'version'        => '1.0.0',
                'exported_from'  => site_url(),
                'exported_at'    => current_time('mysql'),
                'count'          => 0,
                'configurations' => array()
            ));
            return;
        }

        $configs = $wpdb->get_results("SELECT * FROM $table_name ORDER BY id ASC");
        
        $export_list = array();
        foreach ($configs as $config) {
            $points = json_decode($config->points, true);
            $export_list[] = array(
                'config_name' => $config->config_name,
                'title'       => $config->title,
                'image_url'   => $config->image_url,
                'points'      => is_array($points) ? $points : array(),
            );
        }
        
        $export_payload = array(
            'version'        => '1.0.0',
            'exported_from'  => site_url(),
            'exported_at'    => current_time('mysql'),
            'count'          => count($export_list),
            'configurations' => $export_list,
        );
        
        wp_send_json_success($export_payload);
    }

    /**
     * AJAX/Direct endpoint: Export ZIP package (Configurations + Images, or Images Only).
     */
    public function export_pointer_package() {
        $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field($_REQUEST['nonce']) : '';
        if (!wp_verify_nonce($nonce, 'dynamic_pointers_nonce')) {
            wp_die('Security check failed. Please refresh the page and try again.', 'Export Error', array('response' => 403));
        }

        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized user.', 'Export Error', array('response' => 403));
        }

        $export_type = isset($_REQUEST['export_type']) ? sanitize_text_field($_REQUEST['export_type']) : 'both';

        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';

        $configs = array();
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") == $table_name) {
            $configs = $wpdb->get_results("SELECT * FROM $table_name ORDER BY id ASC");
        }

        $export_list = array();
        foreach ($configs as $config) {
            $points = json_decode($config->points, true);
            $export_list[] = array(
                'config_name' => $config->config_name,
                'title'       => $config->title,
                'image_url'   => $config->image_url,
                'points'      => is_array($points) ? $points : array(),
            );
        }

        $export_payload = array(
            'version'        => '1.0.0',
            'exported_from'  => site_url(),
            'exported_at'    => current_time('mysql'),
            'count'          => count($export_list),
            'configurations' => $export_list,
        );

        // If JSON only was requested through this endpoint
        if ($export_type === 'json') {
            $json_str = wp_json_encode($export_payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $filename = 'dynamic-pointers-export-' . date('Y-m-d') . '.json';
            
            while (ob_get_level()) { ob_end_clean(); }
            nocache_headers();
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . strlen($json_str));
            echo $json_str;
            exit;
        }

        // Check ZipArchive availability
        if (!class_exists('ZipArchive')) {
            wp_die('The PHP ZipArchive extension is not enabled on this server. Please enable it in php.ini to export ZIP archives.', 'ZIP Not Supported');
        }

        // Create temporary directory for ZIP creation
        $upload_dir = wp_upload_dir();
        $temp_dir = trailingslashit($upload_dir['basedir']) . 'dip_temp_' . wp_generate_password(8, false, false);
        wp_mkdir_p($temp_dir);
        $temp_zip = $temp_dir . '/export.zip';

        $zip = new ZipArchive();
        if ($zip->open($temp_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            wp_die('Failed to create temporary ZIP archive.', 'Export Error');
        }

        // Add JSON if export_type is 'both'
        if ($export_type === 'both') {
            $zip->addFromString('dynamic-pointers-export.json', wp_json_encode($export_payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

        // Add images
        $added_files = array();
        foreach ($configs as $config) {
            $img_url = trim($config->image_url);
            if (empty($img_url)) {
                continue;
            }

            $raw_filename = basename(strtok($img_url, '?#'));
            $clean_filename = sanitize_file_name($raw_filename);
            if (empty($clean_filename)) {
                continue;
            }

            if (isset($added_files[$clean_filename])) {
                continue;
            }

            $entry_path = ($export_type === 'both') ? ('images/' . $clean_filename) : $clean_filename;
            $local_path = $this->find_image_local_path($img_url);

            if ($local_path && file_exists($local_path)) {
                $zip->addFile($local_path, $entry_path);
                $added_files[$clean_filename] = true;
            } else {
                // Remote fetch fallback
                $response = wp_safe_remote_get($img_url, array('timeout' => 15, 'sslverify' => false));
                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $body = wp_remote_retrieve_body($response);
                    if (!empty($body)) {
                        $zip->addFromString($entry_path, $body);
                        $added_files[$clean_filename] = true;
                    }
                }
            }
        }

        $zip->close();

        if (!file_exists($temp_zip)) {
            wp_die('ZIP archive could not be generated.', 'Export Error');
        }

        $download_filename = ($export_type === 'images') 
            ? 'dynamic-pointers-images-' . date('Y-m-d') . '.zip' 
            : 'dynamic-pointers-backup-' . date('Y-m-d') . '.zip';

        while (ob_get_level()) { ob_end_clean(); }
        nocache_headers();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $download_filename . '"');
        header('Content-Length: ' . filesize($temp_zip));
        header('Pragma: no-cache');
        header('Expires: 0');
        readfile($temp_zip);

        // Cleanup temp files
        @unlink($temp_zip);
        @rmdir($temp_dir);
        exit;
    }

    /**
     * AJAX endpoint: Import ZIP package (or file upload).
     */
    public function import_pointer_package() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Unauthorized user.'));
            return;
        }

        if (empty($_FILES['import_file']) || $_FILES['import_file']['error'] !== UPLOAD_ERR_OK) {
            $err_code = isset($_FILES['import_file']['error']) ? $_FILES['import_file']['error'] : 'Unknown';
            wp_send_json_error(array('message' => 'File upload error (Code: ' . $err_code . '). Please check file size or permissions.'));
            return;
        }

        $uploaded_file = $_FILES['import_file'];
        $orig_name     = strtolower($uploaded_file['name']);
        $overwrite     = isset($_POST['overwrite']) && $_POST['overwrite'] === 'true';
        $find_url      = isset($_POST['find_url']) ? trim(wp_unslash($_POST['find_url'])) : '';
        $replace_url   = isset($_POST['replace_url']) ? trim(wp_unslash($_POST['replace_url'])) : '';

        // If a JSON file was uploaded via file input
        if (substr($orig_name, -5) === '.json') {
            $raw_json = file_get_contents($uploaded_file['tmp_name']);
            $_POST['import_data'] = $raw_json;
            $this->import_pointer_configs();
            return;
        }

        // Process as ZIP archive
        if (!class_exists('ZipArchive')) {
            wp_send_json_error(array('message' => 'The PHP ZipArchive extension is not enabled on this server. Unable to unpack ZIP packages.'));
            return;
        }

        $upload_dir = wp_upload_dir();
        $extract_dir = trailingslashit($upload_dir['basedir']) . 'dip_extract_' . wp_generate_password(10, false, false);
        wp_mkdir_p($extract_dir);

        $zip = new ZipArchive();
        if ($zip->open($uploaded_file['tmp_name']) !== true) {
            wp_send_json_error(array('message' => 'Invalid or corrupted ZIP package.'));
            return;
        }

        $zip->extractTo($extract_dir);
        $zip->close();

        // Load required WordPress media scripts
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');

        // Locate files inside extract_dir recursively
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($extract_dir, RecursiveDirectoryIterator::SKIP_DOTS));
        $json_file = null;
        $image_files = array();

        $allowed_exts = array('png', 'jpg', 'jpeg', 'webp', 'gif', 'svg');

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $ext = strtolower($item->getExtension());
                if ($ext === 'json' && !$json_file) {
                    $json_file = $item->getPathname();
                } elseif (in_array($ext, $allowed_exts, true)) {
                    $image_files[] = $item->getPathname();
                }
            }
        }

        // Process Images into Media Library
        $imported_images_map = array();
        $imported_images_count = 0;

        foreach ($image_files as $img_path) {
            $filename = basename($img_path);
            $clean_filename = sanitize_file_name($filename);

            $target_path = trailingslashit($upload_dir['path']) . $clean_filename;
            
            // Avoid duplicate name collisions if file differs
            if (file_exists($target_path)) {
                $target_path = trailingslashit($upload_dir['path']) . wp_unique_filename($upload_dir['path'], $clean_filename);
            }

            if (@copy($img_path, $target_path)) {
                $wp_filetype = wp_check_filetype(basename($target_path), null);
                $attachment = array(
                    'post_mime_type' => $wp_filetype['type'],
                    'post_title'     => preg_replace('/\.[^.]+$/', '', basename($target_path)),
                    'post_content'   => '',
                    'post_status'    => 'inherit'
                );

                $attach_id = wp_insert_attachment($attachment, $target_path);
                if (!is_wp_error($attach_id) && $attach_id) {
                    $attach_data = wp_generate_attachment_metadata($attach_id, $target_path);
                    wp_update_attachment_metadata($attach_id, $attach_data);
                    $new_url = wp_get_attachment_url($attach_id);
                } else {
                    $new_url = trailingslashit($upload_dir['url']) . basename($target_path);
                }

                $imported_images_map[$filename] = $new_url;
                $imported_images_map[$clean_filename] = $new_url;
                $imported_images_count++;
            }
        }

        // If no JSON was found (e.g. Images Only zip)
        if (!$json_file) {
            $this->recursive_delete_dir($extract_dir);
            wp_send_json_success(array(
                'message' => "Images package imported successfully! Added {$imported_images_count} image(s) to your WordPress Media Library.",
                'configurations_imported' => 0,
                'configurations_updated'  => 0,
                'images_imported'         => $imported_images_count,
            ));
            return;
        }

        // Read and parse JSON configurations
        $raw_json = file_get_contents($json_file);
        $data = json_decode($raw_json, true);
        if (!is_array($data)) {
            $this->recursive_delete_dir($extract_dir);
            wp_send_json_error(array('message' => 'The JSON configuration file inside the ZIP is invalid.'));
            return;
        }

        $configurations = array();
        if (isset($data['configurations']) && is_array($data['configurations'])) {
            $configurations = $data['configurations'];
        } elseif (isset($data[0]) && is_array($data[0])) {
            $configurations = $data;
        }

        // Ensure database table exists
        global $wpdb;
        $table_name      = $wpdb->prefix . 'dynamic_pointers';
        $charset_collate = $wpdb->get_charset_collate();

        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            $sql = "CREATE TABLE {$table_name} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                config_name varchar(191) NOT NULL,
                title varchar(255) NOT NULL,
                image_url text NOT NULL,
                points longtext NOT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY config_name (config_name)
            ) {$charset_collate};";
            dbDelta($sql);
        }

        $imported_count = 0;
        $updated_count  = 0;
        $skipped_count  = 0;

        foreach ($configurations as $cfg) {
            $config_name = isset($cfg['config_name']) ? sanitize_text_field($cfg['config_name']) : '';
            if (empty($config_name)) {
                continue;
            }

            $existing_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE config_name = %s", $config_name));
            if ($existing_id && !$overwrite) {
                $skipped_count++;
                continue;
            }

            $title     = isset($cfg['title']) ? sanitize_text_field($cfg['title']) : '';
            $image_url = isset($cfg['image_url']) ? esc_url_raw($cfg['image_url']) : '';
            $orig_fn   = basename(strtok($image_url, '?#'));

            // Auto-remap to the newly imported image if found in the package!
            if (!empty($orig_fn) && isset($imported_images_map[$orig_fn])) {
                $image_url = $imported_images_map[$orig_fn];
            } elseif (!empty($find_url) && !empty($replace_url)) {
                $image_url = str_replace($find_url, $replace_url, $image_url);
            }

            // Process points
            $points_input = isset($cfg['points']) ? $cfg['points'] : (isset($cfg['points_decoded']) ? $cfg['points_decoded'] : array());
            if (is_string($points_input)) {
                $points_input = json_decode($points_input, true);
            }
            if (!is_array($points_input)) {
                $points_input = array();
            }

            $sanitized_points = array();
            foreach ($points_input as $pt) {
                $sanitized_points[] = array(
                    'position' => array(
                        'top'    => isset($pt['position']['top']) ? sanitize_text_field($pt['position']['top']) : '',
                        'left'   => isset($pt['position']['left']) ? sanitize_text_field($pt['position']['left']) : '',
                        'right'  => isset($pt['position']['right']) ? sanitize_text_field($pt['position']['right']) : '',
                        'bottom' => isset($pt['position']['bottom']) ? sanitize_text_field($pt['position']['bottom']) : '',
                    ),
                    'title'       => isset($pt['title']) ? sanitize_text_field($pt['title']) : '',
                    'description' => isset($pt['description']) ? sanitize_textarea_field($pt['description']) : '',
                );
            }

            $points_json = wp_json_encode($sanitized_points);

            $save_data = array(
                'config_name' => $config_name,
                'title'       => $title,
                'image_url'   => $image_url,
                'points'      => $points_json,
            );
            $format = array('%s', '%s', '%s', '%s');

            if ($existing_id) {
                $res = $wpdb->update($table_name, $save_data, array('id' => $existing_id), $format, array('%d'));
                if ($res !== false) {
                    $updated_count++;
                }
            } else {
                $res = $wpdb->insert($table_name, $save_data, $format);
                if ($res !== false) {
                    $imported_count++;
                }
            }
        }

        // Clean up temporary extract directory
        $this->recursive_delete_dir($extract_dir);

        $total_affected = $imported_count + $updated_count;
        $details = array();
        if ($imported_count > 0) $details[] = "{$imported_count} new created";
        if ($updated_count > 0)  $details[] = "{$updated_count} updated";
        if ($skipped_count > 0)  $details[] = "{$skipped_count} skipped";
        $details_str = count($details) > 0 ? " (" . implode(', ', $details) . ")" : "";

        $img_msg = $imported_images_count > 0 ? " and {$imported_images_count} image(s) to Media Library" : "";

        wp_send_json_success(array(
            'message'        => "Import successfully completed! Processed {$total_affected} configuration(s){$details_str}{$img_msg}.",
            'imported_count' => $imported_count,
            'updated_count'  => $updated_count,
            'skipped_count'  => $skipped_count,
            'images_imported'=> $imported_images_count,
            'total_affected' => $total_affected,
        ));
    }

    /**
     * Recursively delete a temporary directory.
     */
    private function recursive_delete_dir($dir) {
        if (!is_dir($dir)) return;
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            $path = "$dir/$file";
            is_dir($path) ? $this->recursive_delete_dir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    public function import_pointer_configs() {
        check_ajax_referer('dynamic_pointers_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Unauthorized'));
            return;
        }
        
        $raw_json = isset($_POST['import_data']) ? wp_unslash($_POST['import_data']) : '';
        if (empty($raw_json)) {
            wp_send_json_error(array('message' => 'No import data received.'));
            return;
        }
        
        $data = json_decode($raw_json, true);
        if (!is_array($data)) {
            wp_send_json_error(array('message' => 'Invalid JSON format. Please ensure valid JSON was uploaded.'));
            return;
        }
        
        // Support both structured export envelope and direct list
        $configurations = array();
        if (isset($data['configurations']) && is_array($data['configurations'])) {
            $configurations = $data['configurations'];
        } elseif (isset($data[0]) && is_array($data[0])) {
            $configurations = $data;
        } else {
            wp_send_json_error(array('message' => 'No configurations found in the JSON file.'));
            return;
        }
        
        $find_url    = isset($_POST['find_url']) ? trim(wp_unslash($_POST['find_url'])) : '';
        $replace_url = isset($_POST['replace_url']) ? trim(wp_unslash($_POST['replace_url'])) : '';
        $overwrite   = isset($_POST['overwrite']) && $_POST['overwrite'] === 'true';
        
        global $wpdb;
        $table_name      = $wpdb->prefix . 'dynamic_pointers';
        $charset_collate = $wpdb->get_charset_collate();
        
        // Ensure table exists on import
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            $sql = "CREATE TABLE {$table_name} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                config_name varchar(191) NOT NULL,
                title varchar(255) NOT NULL,
                image_url text NOT NULL,
                points longtext NOT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY config_name (config_name)
            ) {$charset_collate};";
            dbDelta($sql);
        }
        
        $imported_count = 0;
        $updated_count  = 0;
        $skipped_count  = 0;
        
        foreach ($configurations as $cfg) {
            $config_name = isset($cfg['config_name']) ? sanitize_text_field($cfg['config_name']) : '';
            if (empty($config_name)) {
                continue;
            }
            
            $existing_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE config_name = %s", $config_name));
            if ($existing_id && !$overwrite) {
                $skipped_count++;
                continue;
            }
            
            $title     = isset($cfg['title']) ? sanitize_text_field($cfg['title']) : '';
            $image_url = isset($cfg['image_url']) ? esc_url_raw($cfg['image_url']) : '';
            
            // Automatic or manual image URL remapping
            if (!empty($find_url) && !empty($replace_url)) {
                $image_url = str_replace($find_url, $replace_url, $image_url);
            }
            
            // Process points
            $points_input = isset($cfg['points']) ? $cfg['points'] : (isset($cfg['points_decoded']) ? $cfg['points_decoded'] : array());
            if (is_string($points_input)) {
                $points_input = json_decode($points_input, true);
            }
            if (!is_array($points_input)) {
                $points_input = array();
            }
            
            $sanitized_points = array();
            foreach ($points_input as $pt) {
                $sanitized_points[] = array(
                    'position' => array(
                        'top'    => isset($pt['position']['top']) ? sanitize_text_field($pt['position']['top']) : '',
                        'left'   => isset($pt['position']['left']) ? sanitize_text_field($pt['position']['left']) : '',
                        'right'  => isset($pt['position']['right']) ? sanitize_text_field($pt['position']['right']) : '',
                        'bottom' => isset($pt['position']['bottom']) ? sanitize_text_field($pt['position']['bottom']) : '',
                    ),
                    'title'       => isset($pt['title']) ? sanitize_text_field($pt['title']) : '',
                    'description' => isset($pt['description']) ? sanitize_textarea_field($pt['description']) : '',
                );
            }
            
            $points_json = wp_json_encode($sanitized_points);
            
            $save_data = array(
                'config_name' => $config_name,
                'title'       => $title,
                'image_url'   => $image_url,
                'points'      => $points_json,
            );
            $format = array('%s', '%s', '%s', '%s');
            
            if ($existing_id) {
                $res = $wpdb->update($table_name, $save_data, array('id' => $existing_id), $format, array('%d'));
                if ($res !== false) {
                    $updated_count++;
                }
            } else {
                $res = $wpdb->insert($table_name, $save_data, $format);
                if ($res !== false) {
                    $imported_count++;
                }
            }
        }
        
        $total_affected = $imported_count + $updated_count;
        $details = array();
        if ($imported_count > 0) $details[] = "{$imported_count} new created";
        if ($updated_count > 0)  $details[] = "{$updated_count} updated";
        if ($skipped_count > 0)  $details[] = "{$skipped_count} skipped";
        
        $details_str = count($details) > 0 ? " (" . implode(', ', $details) . ")" : "";
        
        wp_send_json_success(array(
            'message'        => "Import successfully completed! Processed {$total_affected} configuration(s){$details_str}.",
            'imported_count' => $imported_count,
            'updated_count'  => $updated_count,
            'skipped_count'  => $skipped_count,
            'total_affected' => $total_affected,
        ));
    }
    
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'config' => '',
            'height' => ''
        ), $atts);
        
        if (empty($atts['config'])) {
            return '<p>Please specify a configuration name.</p>';
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'dynamic_pointers';
        
        $config = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE config_name = %s",
            $atts['config']
        ));
        
        if (!$config) {
            return '<p>Configuration not found: ' . esc_html($atts['config']) . '</p>';
        }
        
        $points = json_decode($config->points, true);
        if (!is_array($points)) {
            $points = array();
        }
        $unique_id = 'pointer-' . uniqid();
        
        $config_data = array(
            'title'     => $config->title,
            'image_url' => $config->image_url,
            'points'    => $points,
        );
        $encoded_config = wp_json_encode($config_data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
        
        ob_start();
        ?>
        <div class="dynamic-pointer-container" id="<?php echo esc_attr($unique_id); ?>" 
             data-config="<?php echo esc_attr($encoded_config); ?>">
            
            <div class="image-container"<?php if (!empty($atts['height'])) { echo ' style="height: ' . esc_attr($atts['height']) . ';"'; } ?>>
                <img src="<?php echo esc_url($config->image_url); ?>" alt="<?php echo esc_attr($config->title); ?>" class="diagram-image">
                <!-- Pointers will be dynamically added here -->
            </div>
            
            <div class="scroll-panel">
                <!-- <div class="scroll-header"><?php echo esc_html($config->title); ?></div> -->
                <div class="scroll-content">
                    <div class="items-container">
                        <!-- Cards will be dynamically added here -->
                    </div>
                </div>
                <div class="navigation-dots">
                    <!-- Dots will be dynamically added here -->
                </div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            if (typeof DynamicPointerSystem !== 'undefined') {
                new DynamicPointerSystem('<?php echo $unique_id; ?>');
            }
        });
        </script>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
new DynamicImagePointers();

// Sample usage in functions.php or plugin:
function create_sample_pointer_configs() {
    // This function can be used to programmatically create configs
    global $wpdb;
    $table_name = $wpdb->prefix . 'dynamic_pointers';
    
    // Example: Equipment Layout
    $equipment_points = array(
        array(
            'position' => array('top' => '20', 'left' => '10'),
            'title' => 'Control Panel',
            'description' => 'Main control interface for equipment operation and monitoring.'
        ),
        array(
            'position' => array('top' => '40', 'right' => '15'),
            'title' => 'Output Tray',
            'description' => 'Finished product collection area with automated sorting capabilities.'
        )
        // Add more points...
    );
    
    $wpdb->replace(
        $table_name,
        array(
            'config_name' => 'equipment-layout',
            'title' => 'Equipment Layout',
            'image_url' => 'https://your-site.com/wp-content/uploads/equipment.jpg',
            'points' => json_encode($equipment_points)
        ),
        array('%s', '%s', '%s', '%s')
    );
}

// Uncomment to create sample data:
// add_action('init', 'create_sample_pointer_configs');
?>