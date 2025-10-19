#!/bin/bash
# Test script to verify labels and filters are working

echo "🔍 Testing ELK Labels and Filters"
echo "=================================="
echo ""

# Wait for services to be ready
echo "⏳ Checking if ELK is ready..."
sleep 2

# Check Logstash output (shows what fields are being processed)
echo "📊 Logstash processing logs (last 20 lines):"
echo "-------------------------------------------"
docker logs logstash --tail 20 2>&1 | grep -v "^{" | tail -5
echo ""

# Check what's in Elasticsearch
echo "📦 Checking Elasticsearch indices:"
curl -s "http://localhost:9200/_cat/indices/ft_transcendence-*?v&h=index,docs.count"
echo ""
echo ""

# Get a sample document to see structure
echo "📄 Sample document structure:"
echo "----------------------------"
curl -s "http://localhost:9200/ft_transcendence-*/_search?size=1&pretty" | grep -A 3 -E '"(service|container|tags|message)"' | head -20
echo ""
echo ""

# Check for service field
echo "🏷️  Checking 'service' field aggregation:"
curl -s "http://localhost:9200/ft_transcendence-*/_search?size=0&pretty" -H 'Content-Type: application/json' -d'{
  "aggs": {
    "services": {
      "terms": {
        "field": "service.keyword",
        "size": 10
      }
    }
  }
}' | grep -A 15 "aggregations"
echo ""
echo ""

# Check for tags
echo "🏷️  Checking 'tags' field aggregation:"
curl -s "http://localhost:9200/ft_transcendence-*/_search?size=0&pretty" -H 'Content-Type: application/json' -d'{
  "aggs": {
    "tags": {
      "terms": {
        "field": "tags",
        "size": 10
      }
    }
  }
}' | grep -A 15 "aggregations"
echo ""
echo ""

# Check container names
echo "📦 Checking container names in logs:"
curl -s "http://localhost:9200/ft_transcendence-*/_search?size=0&pretty" -H 'Content-Type: application/json' -d'{
  "aggs": {
    "containers": {
      "terms": {
        "field": "container.name.keyword",
        "size": 10
      }
    }
  }
}' | grep -A 15 "aggregations"
echo ""
echo ""

# Test specific queries
echo "🔍 Testing queries:"
echo "-----------------"

echo "Frontend logs count:"
curl -s "http://localhost:9200/ft_transcendence-*/_count?pretty" -H 'Content-Type: application/json' -d'{
  "query": {
    "match": {
      "service": "frontend"
    }
  }
}'
echo ""

echo "Backend logs count:"
curl -s "http://localhost:9200/ft_transcendence-*/_count?pretty" -H 'Content-Type: application/json' -d'{
  "query": {
    "match": {
      "service": "backend"
    }
  }
}'
echo ""

echo "Logs with 'frontend' tag count:"
curl -s "http://localhost:9200/ft_transcendence-*/_count?pretty" -H 'Content-Type: application/json' -d'{
  "query": {
    "match": {
      "tags": "frontend"
    }
  }
}'
echo ""

echo ""
echo "✅ Test complete!"
echo ""
echo "💡 If service field is empty, check:"
echo "   1. docker logs logstash | tail -50"
echo "   2. Make sure containers have labels in docker-compose.yml"
echo "   3. Run: make re (to rebuild everything)"
