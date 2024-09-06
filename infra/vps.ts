const webVps = new digitalocean.Droplet("Server", {
  name: "startup-template-vps",
  tags: ["web"],
  image: "docker-20-04",
  size: digitalocean.DropletSlug.DropletS1VCPU1GB,
  backups: false, // do this manually with s3
  dropletAgent: false,
  gracefulShutdown: true,
  ipv6: true,
  monitoring: true,
  region: digitalocean.Region.SFO3,
  resizeDisk: true,
  sshKeys: ["43190601"],
  volumeIds: [], // additional storage
});

const webFirewall = new digitalocean.Firewall("Firewall", {
  dropletIds: [webVps.id.apply((str) => parseInt(str, 10))],
  name: "startup-template-vps-firewall",
  tags: ["web"],
  inboundRules: [
    {
      // SSH
      protocol: "tcp",
      portRange: "22",
      // allow all IP addresses so I can SSH from anywhere
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

/** https://github.com/pulumi/pulumi/discussions/9010 */
// const dropletDocker = new docker.Provider(
//   "DropletDocker",
//   { host: $interpolate`ssh://root@${webVps.ipv4Address}` },
//   { dependsOn: webVps },
// );
//
// const dockerNetwork = new docker.Network(
//   "DockerNetwork",
//   {
//     name: "startup-template-docker-network",
//     driver: "bridge",
//     options: {
//       "com.docker.network.bridge.enable_icc": "true",
//       "com.docker.network.bridge.enable_ip_masquerade": "true",
//     },
//   },
//   { provider: dropletDocker },
// );

// const nginxContainer = new docker.Container(
//   "Nginx",
//   {
//     name: "startup-template-nginx-container",
//     image: "startup-template-nginx:latest",
//     networksAdvanced: [{ name: dockerNetwork.name }],
//     ports: [
//       // TODO: check if you can connect without exposing ports
//       { internal: 80, external: 80 }, // HTTP
//       { internal: 443, external: 443 }, // HTTPS
//     ],
//   },
//   { provider: dropletDocker },
// );
//
// const mainPostgresContainer = new docker.Container("MainPostgres", {
//   name: "startup-template-main-postgres-container",
//   image: "startup-template-main-postgres:latest",
//   ports: [{ internal: 5432, external: 5432 }],
// });
