import { baseName } from "./utils";

if (!$dev) {
  const webVps = new digitalocean.Droplet("Server", {
    name: `${baseName}-vps`,
    tags: ["web", $app.stage],
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
    name: `${baseName}-firewall`,
    tags: ["web"],
    inboundRules: [
      {
        // SSH
        // NOTE: docker image has UFW rate limiting for ssh
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
  var dropletDocker = new docker.Provider(
    "DropletDocker",
    { host: $interpolate`ssh://root@${webVps.ipv4Address}` },
    { dependsOn: webVps },
  );
}

export { dropletDocker };
