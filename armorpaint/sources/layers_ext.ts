
function layers_ext_flatten(height_to_normal: bool = false, layers: slot_layer_t[] = null): slot_layer_t {
	if (layers == null) {
		layers = project_layers;
	}
	layers_make_temp_img();
	layers_make_export_img();

	let empty_rt: render_target_t = map_get(render_path_render_targets, "empty_white");
	let empty: gpu_texture_t = empty_rt._image;

	// Clear export layer
	_gpu_begin(layers_expa, null, null, clear_flag_t.COLOR, color_from_floats(0.0, 0.0, 0.0, 0.0));
	gpu_end();
	_gpu_begin(layers_expb, null, null, clear_flag_t.COLOR, color_from_floats(0.5, 0.5, 1.0, 0.0));
	gpu_end();
	_gpu_begin(layers_expc, null, null, clear_flag_t.COLOR, color_from_floats(1.0, 0.0, 0.0, 0.0));
	gpu_end();

	// Flatten layers
	for (let i: i32 = 0; i < layers.length; ++i) {
		let l1: slot_layer_t = layers[i];
		if (!slot_layer_is_visible(l1)) {
			continue;
		}
		if (!slot_layer_is_layer(l1)) {
			continue;
		}

		let mask: gpu_texture_t = empty;
		let l1masks: slot_layer_t[] = slot_layer_get_masks(l1);
		if (l1masks != null) {
			if (l1masks.length > 1) {
				layers_make_temp_mask_img();
				draw_begin(pipes_temp_mask_image, clear_flag_t.COLOR, 0x00000000);
				draw_end();
				let l1: slot_layer_t = { texpaint: pipes_temp_mask_image };
				for (let i: i32 = 0; i < l1masks.length; ++i) {
					layers_merge_layer(l1, l1masks[i]);
				}
				mask = pipes_temp_mask_image;
			}
			else {
				mask = l1masks[0].texpaint;
			}
		}

		if (l1.paint_base) {
			draw_begin(layers_temp_image); // Copy to temp
			draw_set_pipeline(pipes_copy);
			draw_image(layers_expa, 0, 0);
			draw_set_pipeline(null);
			draw_end();

			///if is_forge
			// Do not multiply basecol by alpha
			draw_begin(layers_expa); // Copy to temp
			draw_set_pipeline(pipes_copy);
			draw_image(l1.texpaint, 0, 0);
			draw_set_pipeline(null);
			draw_end();
			///else
			_gpu_begin(layers_expa);
			gpu_set_pipeline(pipes_merge);
			gpu_set_texture(pipes_tex0, l1.texpaint);
			gpu_set_texture(pipes_tex1, empty);
			gpu_set_texture(pipes_texmask, mask);
			gpu_set_texture(pipes_texa, layers_temp_image);
			gpu_set_float(pipes_opac, slot_layer_get_opacity(l1));
			gpu_set_float(pipes_tex1w, empty.width);
			gpu_set_int(pipes_blending, layers.length > 1 ? l1.blending : 0);
			gpu_set_vertex_buffer(const_data_screen_aligned_vb);
			gpu_set_index_buffer(const_data_screen_aligned_ib);
			gpu_draw();
			gpu_end();
			///end
		}

		if (l1.paint_nor) {
			draw_begin(layers_temp_image);
			draw_set_pipeline(pipes_copy);
			draw_image(layers_expb, 0, 0);
			draw_set_pipeline(null);
			draw_end();

			_gpu_begin(layers_expb);
			gpu_set_pipeline(pipes_merge);
			gpu_set_texture(pipes_tex0, l1.texpaint);
			gpu_set_texture(pipes_tex1, l1.texpaint_nor);
			gpu_set_texture(pipes_texmask, mask);
			gpu_set_texture(pipes_texa, layers_temp_image);
			gpu_set_float(pipes_opac, slot_layer_get_opacity(l1));
			gpu_set_float(pipes_tex1w, l1.texpaint_nor.width);
			gpu_set_int(pipes_blending, l1.paint_nor_blend ? 102 : 101);
			gpu_set_vertex_buffer(const_data_screen_aligned_vb);
			gpu_set_index_buffer(const_data_screen_aligned_ib);
			gpu_draw();
			gpu_end();
		}

		if (l1.paint_occ || l1.paint_rough || l1.paint_met || l1.paint_height) {
			draw_begin(layers_temp_image);
			draw_set_pipeline(pipes_copy);
			draw_image(layers_expc, 0, 0);
			draw_set_pipeline(null);
			draw_end();

			if (l1.paint_occ && l1.paint_rough && l1.paint_met && l1.paint_height) {
				layers_commands_merge_pack(pipes_merge, layers_expc, l1.texpaint, l1.texpaint_pack, slot_layer_get_opacity(l1), mask, l1.paint_height_blend ? 103 : 101);
			}
			else {
				if (l1.paint_occ) {
					layers_commands_merge_pack(pipes_merge_r, layers_expc, l1.texpaint, l1.texpaint_pack, slot_layer_get_opacity(l1), mask);
				}
				if (l1.paint_rough) {
					layers_commands_merge_pack(pipes_merge_g, layers_expc, l1.texpaint, l1.texpaint_pack, slot_layer_get_opacity(l1), mask);
				}
				if (l1.paint_met) {
					layers_commands_merge_pack(pipes_merge_b, layers_expc, l1.texpaint, l1.texpaint_pack, slot_layer_get_opacity(l1), mask);
				}
			}
		}
	}

	let l0: slot_layer_t = {
		texpaint: layers_expa,
		texpaint_nor: layers_expb,
		texpaint_pack: layers_expc
	};

	// Merge height map into normal map
	if (height_to_normal && make_material_height_used) {

		draw_begin(layers_temp_image);
		draw_set_pipeline(pipes_copy);
		draw_image(l0.texpaint_nor, 0, 0);
		draw_set_pipeline(null);
		draw_end();

		_gpu_begin(l0.texpaint_nor);
		gpu_set_pipeline(pipes_merge);
		gpu_set_texture(pipes_tex0, layers_temp_image);
		gpu_set_texture(pipes_tex1, l0.texpaint_pack);
		gpu_set_texture(pipes_texmask, empty);
		gpu_set_texture(pipes_texa, empty);
		gpu_set_float(pipes_opac, 1.0);
		gpu_set_float(pipes_tex1w, l0.texpaint_pack.width);
		gpu_set_int(pipes_blending, 104);
		gpu_set_vertex_buffer(const_data_screen_aligned_vb);
		gpu_set_index_buffer(const_data_screen_aligned_ib);
		gpu_draw();
		gpu_end();
	}

	return l0;
}

function layers_ext_on_resized() {
	sys_notify_on_init(function () {
		layers_resize();
		let _layer: slot_layer_t = context_raw.layer;
		let _material: slot_material_t = context_raw.material;
		for (let i: i32 = 0; i < project_layers.length; ++i) {
			let l: slot_layer_t = project_layers[i];
			if (l.fill_layer != null) {
				context_raw.layer = l;
				context_raw.material = l.fill_layer;
				layers_update_fill_layer();
			}
		}
		context_raw.layer = _layer;
		context_raw.material = _material;
		make_material_parse_paint_material();
	});
	util_uv_uvmap = null;
	util_uv_uvmap_cached = false;
	util_uv_trianglemap = null;
	util_uv_trianglemap_cached = false;
	util_uv_dilatemap_cached = false;
	render_path_raytrace_ready = false;
}
