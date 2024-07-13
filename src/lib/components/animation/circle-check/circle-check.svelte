<script lang="ts">
  import { draw } from 'svelte/transition';
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  shape-rendering="geometricPrecision"
  class="lucide lucide-circle-check"
>
  <path d="M12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2" in:draw={{ duration: 1000 }} />
  <path d="m9 12 2 2 4-4" in:draw={{ duration: 1000 }} />
</svg>
