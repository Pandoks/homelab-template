const webVps = new digitalocean.Droplet("Server", {
  image: "ubuntu-24-04-x64",
  size: "s-1vcpu-512mb-10gb",
  backups: false, // do this manually with s3
  dropletAgent: false,
  gracefulShutdown: true,
  ipv6: true,
  monitoring: true,
  name: "startup-template-vps",
  region: "sfo3",
  resizeDisk: true,
  sshKeys: ["43190601"],
  tags: ["web"],
  // userData: initializationScript,
  volumeIds: [], // additional storage
  // vpcUuid: "", // vpc for other services (has as default vpc for itself)
});
