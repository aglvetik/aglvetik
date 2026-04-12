<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:1b1416,50:241b1e,100:2b2124&height=90&section=header&text=workspace&fontSize=28&fontColor=f6e7df&animation=fadeIn" />

</div>

<p align="center">
  <img
    src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=20&duration=38&pause=900&color=F7E7DF&center=true&vCenter=true&multiline=true&repeat=true&width=1100&height=520&lines=%5B+Python+%5D;from+asyncio+import+gather;class+ClusterManager%3A;++++def+__init__%28self%2C+nodes%29%3A;++++++++self.nodes+%3D+nodes;++++async+def+sync%28self%29%3A;++++++++states+%3D+await+gather%28%2A%5Bn.pull%28%29+for+n+in+self.nodes%5D%29;++++++++return+%7B%22online%22%3A+sum%281+for+s+in+states+if+s.ok%29%7D;manager+%3D+ClusterManager%28workers%29;print%28await+manager.sync%28%29%29; ;%5B+TypeScript+%5D;type+Job+%3D+%7B+id%3A+number%3B+status%3A+%22queued%22+%7C+%22running%22+%7C+%22done%22+%7D;const+jobs%3A+Job%5B%5D+%3D+loadJobs%28%29;const+nextJob+%3D+jobs.find%28job+%3D%3E+job.status+%3D%3D%3D+%22queued%22%29;if+%28nextJob%29+%7B;++++nextJob.status+%3D+%22running%22;++++saveJobs%28jobs%29;%7D;console.log%28nextJob+%3F%3F+%22idle%22%29; ;%5B+Go+%5D;package+main;import+%28%22fmt%22+%22net%2Fhttp%22%29;func+health%28w+http.ResponseWriter%2C+r+%2Ahttp.Request%29+%7B;++++fmt.Fprintln%28w%2C+%22status%3A+ok%22%29;%7D;func+main%28%29+%7B;++++http.HandleFunc%28%22%2Fhealth%22%2C+health%29;++++http.ListenAndServe%28%22%3A8080%22%2C+nil%29;%7D; ;%5B+Rust+%5D;struct+Node+%7B+id%3A+u64%2C+online%3A+bool+%7D;fn+count_online%28nodes%3A+%26Vec%3CNode%3E%29+-%3E+usize+%7B;++++nodes.iter%28%29.filter%28%7Cn%7C+n.online%29.count%28%29;%7D;fn+main%28%29+%7B;++++println%21%28%22online+nodes%3A+%7B%7D%22%2C+count_online%28%26nodes%29%29;%7D; ;%5B+SQL+%5D;CREATE+TABLE+jobs+%28;++++id+SERIAL+PRIMARY+KEY%2C;++++name+TEXT+NOT+NULL%2C;++++status+TEXT+NOT+NULL;%29;SELECT+id%2C+name%2C+status+FROM+jobs+ORDER+BY+id+DESC%3B; ;%5B+Bash+%5D;echo+%22building+artifacts...%22;npm+run+build+%26%26+cargo+build+--release;echo+%22uploading+release...%22;rsync+-avz+dist%2F+server%3A%2Fopt%2Fapp%2F;pm2+restart+all"
    alt="code animation"
  />
</p>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:2b2124,50:241b1e,100:1b1416&height=65&section=header&text=python%20%E2%80%A2%20typescript%20%E2%80%A2%20go%20%E2%80%A2%20rust%20%E2%80%A2%20sql%20%E2%80%A2%20bash&fontSize=20&fontColor=f3dfd7" />

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Python-f8ece6?style=for-the-badge&logo=python&logoColor=b98d86" />
  <img src="https://img.shields.io/badge/TypeScript-fcf1ec?style=for-the-badge&logo=typescript&logoColor=c5968f" />
  <img src="https://img.shields.io/badge/Go-f9eee8?style=for-the-badge&logo=go&logoColor=c49a92" />
  <img src="https://img.shields.io/badge/Rust-fef4ef?style=for-the-badge&logo=rust&logoColor=b88b84" />
  <img src="https://img.shields.io/badge/SQL-fbf0ea?style=for-the-badge&logo=postgresql&logoColor=c4958e" />
  <img src="https://img.shields.io/badge/Bash-fdf3ee?style=for-the-badge&logo=gnubash&logoColor=b78a83" />
</p>
