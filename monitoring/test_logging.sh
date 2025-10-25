#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   ELK Stack Logging Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}1. Checking if services are running...${NC}"
if ! docker ps | grep -q "elasticsearch"; then
    echo -e "${RED}❌ Elasticsearch is not running${NC}"
    exit 1
fi
if ! docker ps | grep -q "logstash"; then
    echo -e "${RED}❌ Logstash is not running${NC}"
    exit 1
fi
if ! docker ps | grep -q "kibana"; then
    echo -e "${RED}❌ Kibana is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All ELK services are running${NC}"
echo ""

# Check Elasticsearch health
echo -e "${YELLOW}2. Checking Elasticsearch health...${NC}"
ES_HEALTH=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo -e "   Status: ${GREEN}${ES_HEALTH}${NC}"
echo ""

# Check Logstash pipeline
echo -e "${YELLOW}3. Checking Logstash pipeline...${NC}"
LOGSTASH_STATS=$(curl -s http://localhost:9600/_node/stats/pipelines)
if echo "$LOGSTASH_STATS" | grep -q "main"; then
    echo -e "${GREEN}✅ Logstash pipeline 'main' is active${NC}"
else
    echo -e "${RED}❌ Logstash pipeline not found${NC}"
fi
echo ""

# Check for recent logs
echo -e "${YELLOW}4. Checking for recent logs in Elasticsearch...${NC}"
RECENT_LOGS=$(curl -s "http://localhost:9200/ft_transcendence-*/_count")
LOG_COUNT=$(echo "$RECENT_LOGS" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo -e "   Total logs: ${GREEN}${LOG_COUNT}${NC}"
echo ""

# Get sample log to check structure
echo -e "${YELLOW}5. Fetching sample log structure...${NC}"
SAMPLE_LOG=$(curl -s "http://localhost:9200/ft_transcendence-*/_search?size=1&sort=@timestamp:desc" | jq '.')
echo "$SAMPLE_LOG" | jq '.hits.hits[0]._source | {
    timestamp: .["@timestamp"],
    service: .service.name,
    log_level: .log_level,
    message: .message,
    http_status: .http_status,
    event: .event,
    tags: .tags
}' 2>/dev/null
echo ""

# Check for _jsonparsefailure tags
echo -e "${YELLOW}6. Checking for JSON parse failures...${NC}"
PARSE_FAILURES=$(curl -s "http://localhost:9200/ft_transcendence-*/_count?q=tags:_jsonparsefailure" | grep -o '"count":[0-9]*' | cut -d':' -f2)
if [ "$PARSE_FAILURES" -gt 0 ]; then
    echo -e "${RED}⚠️  Found ${PARSE_FAILURES} logs with _jsonparsefailure${NC}"
    echo -e "${YELLOW}   Showing example:${NC}"
    curl -s "http://localhost:9200/ft_transcendence-*/_search?q=tags:_jsonparsefailure&size=1" | jq '.hits.hits[0]._source' 2>/dev/null
else
    echo -e "${GREEN}✅ No JSON parse failures!${NC}"
fi
echo ""

# Check field mappings
echo -e "${YELLOW}7. Checking available fields...${NC}"
FIELDS=$(curl -s "http://localhost:9200/ft_transcendence-*/_mapping" | jq -r '.. | .properties? // empty | keys[]' | sort -u)
echo -e "${BLUE}Available fields:${NC}"
echo "$FIELDS" | while read field; do
    echo "   • $field"
done
echo ""

# Test backend service logs
echo -e "${YELLOW}8. Checking backend service logs...${NC}"
BACKEND_LOGS=$(curl -s "http://localhost:9200/ft_transcendence-*/_count?q=service.name:backend" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo -e "   Backend logs: ${GREEN}${BACKEND_LOGS}${NC}"

# Check for different log levels
echo -e "${YELLOW}9. Analyzing log levels...${NC}"
for level in INFO WARN ERROR DEBUG; do
    COUNT=$(curl -s "http://localhost:9200/ft_transcendence-*/_count?q=log_level:${level}" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    if [ "$COUNT" -gt 0 ]; then
        echo -e "   ${level}: ${GREEN}${COUNT}${NC}"
    else
        echo -e "   ${level}: ${NC}0"
    fi
done
echo ""

# Check for HTTP status codes
echo -e "${YELLOW}10. Checking HTTP status codes distribution...${NC}"
for status in 200 201 400 401 403 404 409 500; do
    COUNT=$(curl -s "http://localhost:9200/ft_transcendence-*/_count?q=http_status:${status}" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    if [ "$COUNT" -gt 0 ]; then
        if [ "$status" -ge 500 ]; then
            echo -e "   ${status}: ${RED}${COUNT}${NC}"
        elif [ "$status" -ge 400 ]; then
            echo -e "   ${status}: ${YELLOW}${COUNT}${NC}"
        else
            echo -e "   ${status}: ${GREEN}${COUNT}${NC}"
        fi
    fi
done
echo ""

# Recommendations
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Recommendations${NC}"
echo -e "${BLUE}================================================${NC}"

if [ "$PARSE_FAILURES" -gt 0 ]; then
    echo -e "${YELLOW}• Fix JSON parsing issues - check your syslog driver configuration${NC}"
fi

if [ "$LOG_COUNT" -lt 10 ]; then
    echo -e "${YELLOW}• Not enough logs - generate some traffic to your application${NC}"
fi

echo -e "${GREEN}• View logs in Kibana: http://localhost:5601${NC}"
echo -e "${GREEN}• Create index pattern: ft_transcendence-*${NC}"
echo -e "${GREEN}• Suggested Kibana filters:${NC}"
echo -e "  - service.name: backend${NC}"
echo -e "  - log_level: ERROR${NC}"
echo -e "  - http_status >= 400${NC}"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ Test complete!${NC}"
echo -e "${BLUE}================================================${NC}"
