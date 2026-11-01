// Reference model for circuit/draw_mix.blif.
// 17-bit xorshift, one-bit tweak, 9-bit output. NAND-only in the BLIF.
module proofdrop_draw_mix (
  input  wire [16:0] x,
  output wire [8:0]  y
);
  wire [16:0] a = x ^ 17'h1;
  wire [16:0] b = a ^ (a << 7);
  wire [16:0] c = b ^ (b >> 9);
  wire [16:0] d = c ^ (c << 3);
  assign y = d[8:0];
endmodule
