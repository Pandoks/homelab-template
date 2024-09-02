const webVps = new digitalocean.Droplet("Server", {
  name: "startup-template-vps",
  tags: ["web"],
  image: "ubuntu-24-04-x64",
  size: "s-1vcpu-512mb-10gb",
  backups: false, // do this manually with s3
  dropletAgent: false,
  gracefulShutdown: true,
  ipv6: true,
  monitoring: true,
  region: "sfo3",
  resizeDisk: true,
  sshKeys: ["43190601"],
  // userData: initializationScript,
  volumeIds: [], // additional storage
  // vpcUuid: "", // vpc for other services (has as default vpc for itself)
});

const webFirewall = new digitalocean.Firewall("Firewall", {
  dropletIds: [webVps.id.apply((str) => parseInt(str, 10))],
  name: "startup-template-vps-firewall",
  tags: ["web"],
  inboundRules: [
    {
      // SSH view authentication key
      protocol: "tcp",
      portRange: "22",
      sourceAddresses: ["0.0.0.0/0", "::/0"],
    },
    {
      // HTTPS
      protocol: "tcp",
      portRange: "443",
      sourceAddresses: ["0.0.0.0/0", "::/0"],
    },
    {
      // HTTP (for Let's Encrypt challenges)
      protocol: "tcp",
      portRange: "80",
      sourceAddresses: ["0.0.0.0/0", "::/0"],
    },
  ],
  outboundRules: [
    {
      // HTTPS for general secure web traffic
      protocol: "tcp",
      portRange: "443",
      destinationAddresses: ["0.0.0.0/0", "::/0"],
    },
    {
      // HTTP for Let's Encrypt and potential non-HTTPS resources
      protocol: "tcp",
      portRange: "80",
      destinationAddresses: ["0.0.0.0/0", "::/0"],
    },
    // {
    //   // AWS SES SMTP endpoint
    //   protocol: "tcp",
    //   portRange: "587",
    //   destinationAddresses: ["AWS_SES_ENDPOINT_IP"],
    // },
    {
      // DNS queries
      protocol: "udp",
      portRange: "53",
      destinationAddresses: ["0.0.0.0/0", "::/0"],
    },
    {
      // NTP for time synchronization
      protocol: "udp",
      portRange: "123",
      destinationAddresses: ["0.0.0.0/0", "::/0"],
    },
  ],
});

// /** Basically a VPC for the docker containers */
// const dockerNetwork = new docker.Network("DockerNetwork", {
//   name: "startup-template-docker-network",
//   driver: "bridge",
//   options: {
//     "com.docker.network.bridge.enable_icc": "true",
//     "com.docker.network.bridge.enable_ip_masquerade": "true",
//   },
// });

// /** Reverse proxy for routing traffic */
// const nginxContainer = new docker.Container("Nginx", {
//   image: "nginx:latest",
//   networksAdvanced: [{ name: dockerNetwork.name }],
//   ports: [
//     { internal: 80, external: 80 }, // HTTP
//     { internal: 443, external: 443 }, // HTTPS
//   ],
// });
