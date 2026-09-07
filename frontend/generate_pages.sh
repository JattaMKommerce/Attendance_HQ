#!/bin/bash
pages=("social/CompanyFeed" "social/Notes" "social/InternalChat" "intelligence/AIAssistant" "intelligence/Automation" "intelligence/Reports" "management/Recruitment" "management/Onboarding" "management/Performance" "management/Incentives" "operations/Assets" "operations/Expenses" "operations/Documents")

for p in "${pages[@]}"; do
  name=$(basename $p)
  cat << INNER_EOF > "src/pages/${p}.jsx"
import React from 'react';
export default function ${name}() { return <div style={{padding: '24px'}}><h1>${name}</h1></div>; }
INNER_EOF
done
