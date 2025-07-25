
function make_colorid_picker_run(kong: node_shader_t) {
	// Mangle vertices to form full screen triangle
	node_shader_write_vert(kong, "output.pos = float4(-1.0 + float((vertex_id() & 1) << 2), -1.0 + float((vertex_id() & 2) << 1), 0.0, 1.0);");

	node_shader_add_texture(kong, "gbuffer2");
	node_shader_add_constant(kong, "gbuffer_size: float2", "_gbuffer_size");
	node_shader_add_constant(kong, "inp: float4", "_input_brush");

	// node_shader_write_frag(kong, "var tex_coord_inp: float2 = gbuffer2[uint2(constants.inp.x * constants.gbuffer_size.x, constants.inp.y * constants.gbuffer_size.y)].ba;");
	node_shader_write_frag(kong, "var tex_coord_inp4: float4 = gbuffer2[uint2(uint(constants.inp.x * constants.gbuffer_size.x), uint(constants.inp.y * constants.gbuffer_size.y))];");
	node_shader_write_frag(kong, "var tex_coord_inp: float2 = tex_coord_inp4.ba;");

	if (context_raw.tool == workspace_tool_t.COLORID) {
		kong.frag_out = "float4";
		node_shader_add_texture(kong, "texcolorid", "_texcolorid");
		node_shader_write_frag(kong, "var idcol: float3 = sample_lod(texcolorid, sampler_linear, tex_coord_inp, 0.0).rgb;");
		node_shader_write_frag(kong, "output = float4(idcol, 1.0);");
	}
	else if (context_raw.tool == workspace_tool_t.PICKER || context_raw.tool == workspace_tool_t.MATERIAL) {
		if (context_raw.pick_pos_nor_tex) {
			kong.frag_out = "float4[2]";
			node_shader_add_texture(kong, "gbufferD");
			node_shader_add_constant(kong, "invVP: float4x4", "_inv_view_proj_matrix");
			node_shader_add_function(kong, str_get_pos_nor_from_depth);
			node_shader_write_frag(kong, "output[0] = float4(get_pos_from_depth(float2(constants.inp.x, 1.0 - constants.inp.y), constants.invVP), tex_coord_inp.x);");
			node_shader_write_frag(kong, "output[1] = float4(get_nor_from_depth(output[0].rgb, float2(constants.inp.x, 1.0 - constants.inp.y), constants.invVP, float2(1.0, 1.0) / constants.gbuffer_size), tex_coord_inp.y);");
		}
		else {
			kong.frag_out = "float4[4]";
			node_shader_add_texture(kong, "texpaint");
			node_shader_add_texture(kong, "texpaint_nor");
			node_shader_add_texture(kong, "texpaint_pack");
			node_shader_write_frag(kong, "output[0] = sample_lod(texpaint, sampler_linear, tex_coord_inp, 0.0);");
			node_shader_write_frag(kong, "output[1] = sample_lod(texpaint_nor, sampler_linear, tex_coord_inp, 0.0);");
			node_shader_write_frag(kong, "output[2] = sample_lod(texpaint_pack, sampler_linear, tex_coord_inp, 0.0);");
			node_shader_write_frag(kong, "output[3].rg = tex_coord_inp.xy;");
		}
	}
}
