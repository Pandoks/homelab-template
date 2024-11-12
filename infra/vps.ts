import { secrets } from "./secrets";
import { baseName } from "./utils";

if (!$dev) {
  const sshPort = 61189;
  const vpsInit = $interpolate`#cloud-config
bootcmd:
  - iptables -P INPUT DROP
  - iptables -P OUTPUT ACCEPT
  - iptables -A INPUT -i lo -j ACCEPT
  - iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  - iptables -A INPUT -p tcp --dport ${sshPort} -j ACCEPT
  - /etc/cron.daily/update-cloudflare-ips

users:
  - name: pandoks
    groups: sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: true
    ssh_authorized_keys:
      - '${secrets.PublicSSHKey.value}'
  - name: docker
    primary_group: docker
    shell: /bin/bash
    lock_passwd: true
    ssh_authorized_keys:
      - '${secrets.PublicSSHKey.value}'

package_update: true

write_files:
  - path: /etc/ssh/sshd_config
    permissions: '0644'
    owner: root:root
    content: |
      PermitRootLogin no
      PasswordAuthentication no
      KbdInteractiveAuthentication no
      ChallengeResponseAuthentication no
      MaxAuthTries 2
      X11Forwarding no
      AllowAgentForwarding no
      UsePAM yes
      PrintMotd no
      AcceptEnv LANG LC_*
      Subsystem sftp /usr/lib/openssh/sftp-server
      Include /etc/ssh/sshd_config.d/*.conf
      Port ${sshPort}
      AllowUsers pandoks docker
  - path: /lib/systemd/system/ssh.socket
    permissions: '0644'
    owner: root:root
    content: |
      [Unit]
      Description=OpenBSD Secure Shell server socket
      Before=sockets.target ssh.service
      ConditionPathExists=!/etc/ssh/sshd_not_to_be_run

      [Socket]
      ListenStream=${sshPort}
      Accept=no
      FreeBind=yes

      [Install]
      WantedBy=sockets.target
      RequiredBy=ssh.service
  - path: /etc/sysctl.conf
    permissions: '0644'
    owner: root:root
    content: |
      net.ipv4.tcp_syncookies = 1
      net.ipv4.ip_forward = 1
      net.ipv4.conf.all.send_redirects = 0
      net.ipv4.conf.all.accept_source_route = 0
      net.ipv4.conf.all.accept_redirects = 0
      net.ipv4.conf.all.log_martians = 1
      net.ipv4.icmp_echo_ignore_broadcasts = 1
  - path: /etc/crowdsec/acquis.yaml
    permissions: '0644'
    append: true
    owner: root:root
    content: |
      #Generated acquisition file - wizard.sh (service: ssh) / files : /var/log/auth.log
      filenames:
        - /var/log/auth.log
      labels:
        type: syslog
      ---
      #Generated acquisition file - wizard.sh (service: linux) / files : /var/log/syslog /var/log/kern.log
      filenames:
        - /var/log/syslog
        - /var/log/kern.log
      labels:
        type: syslog
      ---
      source: docker
      use_container_labels: true
      ---
  - path: /etc/audit/auditd.conf
    permissions: '0644'
    owner: root:root
    content: |
      log_file = /var/log/audit/audit.log
      log_format = RAW
      log_group = root
      priority_boost = 4
      flush = INCREMENTAL_ASYNC
      freq = 50
      num_logs = 5
      max_log_file = 8
      max_log_file_action = ROTATE
      space_left = 75
      space_left_action = SYSLOG
      admin_space_left = 50
      admin_space_left_action = SUSPEND
      disk_full_action = SUSPEND
      disk_error_action = SUSPEND
  - path: /etc/audit/rules.d/audit.rules
    permissions: '0644'
    owner: root:root
    content: |
      -D
      -b 8192
      -f 1
      -w /etc/passwd -p wa -k identity
      -w /etc/group -p wa -k identity
      -w /etc/shadow -p wa -k identity
      -w /etc/sudoers -p wa -k identity
      -w /var/log/auth.log -p wa -k logins
      -w /var/log/faillog -p wa -k logins
      -w /etc/ssh/sshd_config -p wa -k sshd_config
      -w /etc/docker -p wa -k docker
      -a exit,always -F arch=b64 -S execve -k exec
  - path: /etc/cron.daily/update-cloudflare-ips
    permissions: '0755'
    owner: root:root
    content: |
      #!/bin/bash
      CF_IPS_FILE="/tmp/cloudflare_ips.txt"
      CF_4IPS_FILE="/tmp/cloudflare_4ips"
      CF_6IPS_FILE="/tmp/cloudflare_6ips"
      curl -s https://api.cloudflare.com/client/v4/ips > $CF_IPS_FILE
      grep -oE '"ipv4_cidrs":\\[[^]]*\\]' $CF_IPS_FILE | sed 's/"ipv4_cidrs":\\[//;s/\\]//;s/"//g;s/,/\\n/g' > $\{CF_4IPS_FILE}.tmp
      grep -oE '"ipv6_cidrs":\\[[^]]*\\]' $CF_IPS_FILE | sed 's/"ipv6_cidrs":\\[//;s/\\]//;s/"//g;s/,/\\n/g' >> $\{CF_6IPS_FILE}.tmp

      iptables-save > /tmp/iptables.rules
      sed -i "/comment --comment cloudflare/d" /tmp/iptables.rules
      iptables-restore < /tmp/iptables.rules
      while IFS= read -r ip; do
        iptables -A DOCKER-USER -p tcp -s $ip --dport 80 -m comment --comment 'cloudflare' -j ACCEPT
        iptables -A DOCKER-USER -p tcp -s $ip --dport 443 -m comment --comment 'cloudflare' -j ACCEPT
      done < $\{CF_4IPS_FILE}.tmp
      while IFS= read -r ip; do
        ip6tables -A DOCKER-USER -p tcp -s $ip --dport 80 -m comment --comment 'cloudflare' -j ACCEPT
        ip6tables -A DOCKER-USER -p tcp -s $ip --dport 443 -m comment --comment 'cloudflare' -j ACCEPT
      done < $\{CF_6IPS_FILE}.tmp
      rm $CF_IPS_FILE $\{CF_4IPS_FILE}.tmp $\{CF_6IPS_FILE}.tmp /tmp/iptables.rules

runcmd:
  - /etc/cron.daily/update-cloudflare-ips
  - curl -s https://install.crowdsec.net | sh
  - DEBIAN_FRONTEND=noninteractive apt install rkhunter chkrootkit auditd crowdsec crowdsec-firewall-bouncer-iptables -y
  - cscli hub update
  - cscli collections install crowdsecurity/linux-lpe crowdsecurity/base-http-scenarios
  - cscli scenarios install crowdsecurity/iptables-scan-multi_ports
  - cscli parsers install crowdsecurity/docker-logs
  - systemctl start crowdsec
  - systemctl enable crowdsec
  - systemctl daemon-reload
  - systemctl restart ssh
`;
  const cloudflareIps = ["0.0.0.0/0"];
  const firewall = new hcloud.Firewall("Firewall", {
    name: `${baseName}-firewall`,
    rules: [
      {
        // SSH from anywhere
        direction: "in",
        protocol: "tcp",
        port: sshPort.toString(),
        sourceIps: ["0.0.0.0/0"],
        description: "Allow all SSH connections",
      },
      {
        // Allow HTTP from Cloudflare IPs
        direction: "in",
        protocol: "tcp",
        port: "80",
        sourceIps: cloudflareIps,
        description: "Allow HTTP from Cloudflare IPs",
      },
      {
        // Allow HTTPS from Cloudflare IPs
        direction: "in",
        protocol: "tcp",
        port: "443",
        sourceIps: cloudflareIps,
        description: "Allow HTTPS from Cloudflare IPs",
      },
    ],
  });

  const vps = new hcloud.Server("Server", {
    name: `${baseName}-server`,
    image: "docker-ce",
    location: "hil",
    serverType: "cpx11",
    sshKeys: ["M1 Max Macbook Pro"],
    // deleteProtection: true,
    // rebuildProtection: true,
    publicNets: [
      {
        ipv4Enabled: true,
        ipv6Enabled: true,
      },
    ],
    firewallIds: [firewall.id.apply((id) => parseInt(id, 10))],
    userData: vpsInit,
  });
  vps.ipv4Address.apply((ip) => console.log(`IP: ${ip}, Port: ${sshPort}`));
}
