#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Cleaning up Elasticsearch indices...${NC}"

# Check if Elasticsearch is ready
if ! curl -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Elasticsearch not responding${NC}"
    exit 1
fi

# Delete all ft_transcendence indices
INDICES=$(curl -s "http://localhost:9200/_cat/indices?h=index" | grep "^ft_transcendence" | tr '\n' ' ')

if [ -z "$INDICES" ]; then
    echo -e "${GREEN}✅ No indices to delete${NC}"
else
    echo -e "Found indices: ${YELLOW}${INDICES}${NC}"
    for index in $INDICES; do
        echo -e "  Deleting: ${YELLOW}${index}${NC}"
        curl -s -X DELETE "http://localhost:9200/${index}" > /dev/null
    done
    echo -e "${GREEN}✅ All old indices deleted${NC}"
fi

echo -e "${GREEN}✅ Cleanup complete!${NC}"
