<script lang="ts">
  import qrcode from 'qrcode-generator';

  export let value: string = '';
  let svgElement = '';

  $: if (value) {
    const qr = qrcode(0, 'L');
    qr.addData(value);
    qr.make();
    svgElement = qr.createSvgTag({ margin: 0, scalable: true });
  }
</script>

<div {...$$restProps}>
  {@html svgElement}
</div>
