function t(a,h,n){const r=a==="low"?1:a==="high"?2:n?1.5:1.7;return 1/Math.min(Math.max(1,h||1),r)}export{t as hardwareScale};
